import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { SAMPLE_QUESTIONS } from "../src/lib/quiz/sample-questions";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../src/lib/quiz/types";
import { RoomManager } from "./room-manager";

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

  function revealAndEmit(code: string) {
    const room = rooms.get(code);
    if (!room || room.phase !== "answering") return;
    rooms.reveal(room);
    emitState(code);
  }

  io.on("connection", (socket) => {
    socket.on("room:create", (payload, ack) => {
      try {
        const questions =
          payload.questions && payload.questions.length > 0
            ? payload.questions
            : SAMPLE_QUESTIONS;
        const room = rooms.create(payload.hostId, questions);
        socket.data = { code: room.code, hostId: payload.hostId, role: "host" };
        socket.join(room.code);
        ack?.({ ok: true, code: room.code });
        emitState(room.code);
      } catch (e) {
        ack?.({ ok: false, error: e instanceof Error ? e.message : "建房失敗" });
      }
    });

    socket.on("room:join", (payload, ack) => {
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
      ack?.({ ok: true });
      emitState(result.room.code);
    });

    socket.on("room:rejoin", (payload, ack) => {
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
      ack?.({ ok: true });
      emitState(result.room.code);
    });

    socket.on("host:setQuestions", (payload, ack) => {
      const result = rooms.setQuestions(payload.code, payload.hostId, payload.questions);
      if (!result.ok) {
        ack?.({ ok: false, error: result.error });
        return;
      }
      ack?.({ ok: true });
      emitState(result.room.code);
    });

    socket.on("host:kick", (payload, ack) => {
      const result = rooms.kick(payload.code, payload.hostId, payload.playerId);
      if (!result.ok) {
        ack?.({ ok: false, error: result.error });
        return;
      }
      ack?.({ ok: true });
      emitState(result.room.code);
    });

    socket.on("host:start", (payload, ack) => {
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

      rooms.startQuestion(room, 0, () => revealAndEmit(room.code));
      ack?.({ ok: true });
      emitState(room.code);
    });

    socket.on("host:next", (payload, ack) => {
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
        rooms.finish(room);
        ack?.({ ok: true });
        emitState(room.code);
        return;
      }

      rooms.startQuestion(room, nextIndex, () => revealAndEmit(room.code));
      ack?.({ ok: true });
      emitState(room.code);
    });

    socket.on("host:forceReveal", (payload, ack) => {
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

    socket.on("answer:submit", (payload, ack) => {
      const result = rooms.submitAnswer(payload.code, payload.playerId, payload.choice);
      if (!result.ok) {
        ack?.({ ok: false, error: result.error });
        return;
      }
      ack?.({ ok: true });
      emitState(result.room.code);
      if (result.allAnswered) {
        revealAndEmit(result.room.code);
      }
    });

    socket.on("disconnect", () => {
      const { code, playerId, hostId } = socket.data;
      rooms.markDisconnected(code, socket.id, { playerId, hostId });
      if (code) emitState(code);
    });
  });

  return io;
}
