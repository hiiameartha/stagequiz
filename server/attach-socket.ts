import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { SAMPLE_QUESTIONS } from "../src/lib/quiz/sample-questions";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../src/lib/quiz/types";
import {
  isDbEnabled,
  listMatchesForHost,
  loadQuestionBank,
  loadRoomSnapshot,
  saveMatch,
  saveQuestionBank,
  saveRoom,
} from "./db/persist";
import { RoomManager, type Room } from "./room-manager";

type SocketData = {
  code?: string;
  playerId?: string;
  hostId?: string;
  role?: "host" | "player";
};

export function attachQuizSocket(httpServer: HttpServer, corsOrigin: string | string[] = "*") {
  const rooms = new RoomManager();
  const io = new Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>(
    httpServer,
    {
      cors: { origin: corsOrigin, methods: ["GET", "POST"] },
      transports: ["websocket", "polling"],
    }
  );

  if (isDbEnabled()) {
    console.log("> Postgres persistence enabled");
  } else {
    console.log("> Postgres persistence disabled (no DATABASE_URL)");
  }

  function emitState(code: string) {
    const room = rooms.get(code);
    if (!room) return;
    const members = io.sockets.adapter.rooms.get(code);
    if (!members) return;
    for (const socketId of members) {
      const sock = io.sockets.sockets.get(socketId);
      if (!sock) continue;
      const forHost = sock.data.role === "host";
      sock.emit("room:state", rooms.toState(room, { forHost }));
    }
  }

  async function persistRoom(room: Room) {
    await saveRoom(room);
  }

  async function finishAndPersist(room: Room) {
    rooms.finish(room);
    await persistRoom(room);
    const leaderboard = [...room.players]
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score }));
    await saveMatch({
      code: room.code,
      hostId: room.hostId,
      leaderboard,
      questionCount: room.questions.length,
    });
  }

  function revealAndEmit(code: string) {
    const room = rooms.get(code);
    if (!room || room.phase !== "answering") return;
    rooms.reveal(room);
    void persistRoom(room);
    emitState(code);
  }

  function restoreAnsweringTimer(room: Room) {
    if (room.phase !== "answering") return;
    const endsAt = room.questionEndsAt;
    // 音樂題尚未播放：等 Host 按播放
    if (endsAt == null) return;
    const remaining = endsAt - Date.now();
    if (remaining <= 0) {
      rooms.reveal(room);
      void persistRoom(room);
      return;
    }
    if (room.timer) clearTimeout(room.timer);
    room.timer = setTimeout(() => revealAndEmit(room.code), remaining);
  }

  async function ensureRoom(code: string): Promise<Room | undefined> {
    const existing = rooms.get(code);
    if (existing) return existing;
    const snap = await loadRoomSnapshot(code);
    if (!snap) return undefined;
    const room = rooms.hydrate(snap);
    restoreAnsweringTimer(room);
    return room;
  }

  io.on("connection", (socket) => {
    socket.on("room:create", async (payload, ack) => {
      try {
        const questions =
          payload.questions && payload.questions.length > 0
            ? payload.questions
            : SAMPLE_QUESTIONS;
        const room = rooms.create(payload.hostId, questions);
        socket.data = { code: room.code, hostId: payload.hostId, role: "host" };
        socket.join(room.code);
        await persistRoom(room);
        await saveQuestionBank(questions);
        ack?.({ ok: true, code: room.code });
        emitState(room.code);
      } catch (e) {
        ack?.({ ok: false, error: e instanceof Error ? e.message : "建房失敗" });
      }
    });

    socket.on("room:join", async (payload, ack) => {
      await ensureRoom(payload.code);
      const result = rooms.join(
        payload.code,
        payload.playerId,
        payload.name,
        payload.avatar
      );
      if (!result.ok) {
        ack?.({ ok: false, error: result.error });
        return;
      }
      socket.data = {
        code: result.room.code,
        playerId: payload.playerId,
        role: "player",
      };
      socket.join(result.room.code);
      await persistRoom(result.room);
      ack?.({ ok: true });
      emitState(result.room.code);
    });

    socket.on("room:rejoin", async (payload, ack) => {
      await ensureRoom(payload.code);
      const result = rooms.rejoin(payload.code, payload.playerId, payload.role);
      if (!result.ok) {
        ack?.({ ok: false, error: result.error });
        return;
      }
      socket.data = {
        code: result.room.code,
        role: payload.role,
        ...(payload.role === "host"
          ? { hostId: payload.playerId }
          : { playerId: payload.playerId }),
      };
      socket.join(result.room.code);
      await persistRoom(result.room);
      ack?.({ ok: true });
      emitState(result.room.code);
    });

    socket.on("host:loadBank", async (_payload, ack) => {
      try {
        const questions = await loadQuestionBank();
        ack?.({ ok: true, questions });
      } catch (e) {
        ack?.({
          ok: false,
          error: e instanceof Error ? e.message : "載入題庫失敗",
        });
      }
    });

    socket.on("host:saveBank", async (payload, ack) => {
      try {
        if (!payload.questions?.length) {
          ack?.({ ok: false, error: "至少需要一題" });
          return;
        }
        await saveQuestionBank(payload.questions);
        ack?.({ ok: true });
      } catch (e) {
        ack?.({
          ok: false,
          error: e instanceof Error ? e.message : "儲存題庫失敗",
        });
      }
    });

    socket.on("host:listMatches", async (payload, ack) => {
      try {
        const list = await listMatchesForHost(payload.hostId);
        ack?.({ ok: true, matches: list });
      } catch (e) {
        ack?.({
          ok: false,
          error: e instanceof Error ? e.message : "載入歷史失敗",
        });
      }
    });

    socket.on("host:setQuestions", async (payload, ack) => {
      await ensureRoom(payload.code);
      const result = rooms.setQuestions(payload.code, payload.hostId, payload.questions);
      if (!result.ok) {
        ack?.({ ok: false, error: result.error });
        return;
      }
      await persistRoom(result.room);
      await saveQuestionBank(payload.questions);
      ack?.({ ok: true });
      emitState(result.room.code);
    });

    socket.on("host:kick", async (payload, ack) => {
      await ensureRoom(payload.code);
      const result = rooms.kick(payload.code, payload.hostId, payload.playerId);
      if (!result.ok) {
        ack?.({ ok: false, error: result.error });
        return;
      }
      await persistRoom(result.room);
      ack?.({ ok: true });
      emitState(result.room.code);
    });

    socket.on("host:start", async (payload, ack) => {
      await ensureRoom(payload.code);
      const room = rooms.get(payload.code);
      if (!room) {
        ack?.({ ok: false, error: "找不到房間" });
        return;
      }
      if (room.hostId !== payload.hostId) {
        ack?.({ ok: false, error: "無權限" });
        return;
      }
      if (room.phase !== "lobby") {
        ack?.({ ok: false, error: "目前無法開始" });
        return;
      }
      if (!room.questions.length) {
        ack?.({ ok: false, error: "請先設定題目" });
        return;
      }
      if (!room.players.length) {
        ack?.({ ok: false, error: "至少需要一位挑戰者" });
        return;
      }

      rooms.shuffleQuestionsForRound(room);
      rooms.startQuestion(room, 0, () => revealAndEmit(room.code));
      await persistRoom(room);
      ack?.({ ok: true });
      emitState(room.code);
    });

    socket.on("host:next", async (payload, ack) => {
      await ensureRoom(payload.code);
      const room = rooms.get(payload.code);
      if (!room) {
        ack?.({ ok: false, error: "找不到房間" });
        return;
      }
      if (room.hostId !== payload.hostId) {
        ack?.({ ok: false, error: "無權限" });
        return;
      }
      if (room.phase !== "reveal") {
        ack?.({ ok: false, error: "請先公布答案" });
        return;
      }

      const nextIndex = room.currentIndex + 1;
      if (nextIndex >= room.questions.length) {
        await finishAndPersist(room);
        ack?.({ ok: true });
        emitState(room.code);
        return;
      }

      rooms.startQuestion(room, nextIndex, () => revealAndEmit(room.code));
      await persistRoom(room);
      ack?.({ ok: true });
      emitState(room.code);
    });

    socket.on("host:forceReveal", async (payload, ack) => {
      await ensureRoom(payload.code);
      const room = rooms.get(payload.code);
      if (!room) {
        ack?.({ ok: false, error: "找不到房間" });
        return;
      }
      if (room.hostId !== payload.hostId) {
        ack?.({ ok: false, error: "無權限" });
        return;
      }
      if (room.phase !== "answering") {
        ack?.({ ok: false, error: "目前無法公布" });
        return;
      }
      revealAndEmit(room.code);
      ack?.({ ok: true });
    });

    socket.on("host:endGame", async (payload, ack) => {
      await ensureRoom(payload.code);
      const result = rooms.endGame(payload.code, payload.hostId);
      if (!result.ok) {
        ack?.({ ok: false, error: result.error });
        return;
      }
      await finishAndPersist(result.room);
      ack?.({ ok: true });
      emitState(result.room.code);
    });

    socket.on("host:startTimer", async (payload, ack) => {
      await ensureRoom(payload.code);
      const room = rooms.get(payload.code);
      if (!room) {
        ack?.({ ok: false, error: "找不到房間" });
        return;
      }
      if (room.hostId !== payload.hostId) {
        ack?.({ ok: false, error: "無權限" });
        return;
      }
      const result = rooms.armQuestionTimer(room, () => revealAndEmit(room.code));
      if (!result.ok) {
        ack?.({ ok: false, error: result.error });
        return;
      }
      await persistRoom(result.room);
      ack?.({ ok: true });
      if (!result.already) emitState(result.room.code);
    });

    socket.on("answer:submit", async (payload, ack) => {
      await ensureRoom(payload.code);
      const result = rooms.submitAnswer(payload.code, payload.playerId, payload.choice);
      if (!result.ok) {
        ack?.({ ok: false, error: result.error });
        return;
      }
      await persistRoom(result.room);
      ack?.({ ok: true });
      emitState(result.room.code);
      if (result.allAnswered) {
        revealAndEmit(result.room.code);
      }
    });

    socket.on("disconnect", () => {
      const { code, playerId, hostId } = socket.data;
      rooms.markDisconnected(code, socket.id, { playerId, hostId });
      if (code) {
        const room = rooms.get(code);
        if (room) void persistRoom(room);
        emitState(code);
      }
    });
  });

  return io;
}
