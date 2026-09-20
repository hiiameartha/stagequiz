import { randomBytes } from "crypto";
import { calcPointsEarned } from "../src/lib/quiz/scoring";
import {
  MAX_PLAYERS,
  isAvatarId,
  type AvatarId,
  type Phase,
  type Player,
  type Question,
  type QuestionPublic,
  type RevealEntry,
  type RoomState,
} from "../src/lib/quiz/types";

export type Room = {
  code: string;
  hostId: string;
  phase: Phase;
  currentIndex: number;
  questionEndsAt: number | null;
  players: Player[];
  questions: Question[];
  timer: ReturnType<typeof setTimeout> | null;
};

function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i]! % alphabet.length];
  }
  return code;
}

function toPublicQuestion(
  q: Question,
  includeCorrect: boolean,
  opts: { stripAudioUrl: boolean }
): QuestionPublic {
  const base: QuestionPublic = includeCorrect
    ? { ...q }
    : {
        id: q.id,
        text: q.text,
        options: q.options,
        media: q.media,
        timeLimitSec: q.timeLimitSec,
        points: q.points,
      };

  if (opts.stripAudioUrl && base.media?.type === "audio") {
    return {
      ...base,
      media: { type: "audio", url: "" },
    };
  }
  return base;
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  create(hostId: string, questions: Question[] = []): Room {
    let code = generateCode();
    while (this.rooms.has(code)) code = generateCode();

    const room: Room = {
      code,
      hostId,
      phase: "lobby",
      currentIndex: -1,
      questionEndsAt: null,
      players: [],
      questions: questions.map((q) => ({ ...q })),
      timer: null,
    };
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  delete(code: string) {
    const room = this.get(code);
    if (room?.timer) clearTimeout(room.timer);
    this.rooms.delete(code.toUpperCase());
  }

  join(
    code: string,
    playerId: string,
    name: string,
    avatar: AvatarId
  ): { ok: true; room: Room } | { ok: false; error: string } {
    const room = this.get(code);
    if (!room) return { ok: false, error: "找不到房間" };
    if (room.phase !== "lobby") return { ok: false, error: "遊戲已開始，無法加入" };
    if (!isAvatarId(avatar)) return { ok: false, error: "請選擇頭像" };

    const existing = room.players.find((p) => p.id === playerId);
    if (existing) {
      existing.name = name.trim().slice(0, 20) || existing.name;
      existing.avatar = avatar;
      existing.connected = true;
      return { ok: true, room };
    }

    if (room.players.length >= MAX_PLAYERS) {
      return { ok: false, error: `房間已滿（最多 ${MAX_PLAYERS} 人）` };
    }

    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return { ok: false, error: "請輸入暱稱" };

    const avatarTaken = room.players.some((p) => p.avatar === avatar);
    if (avatarTaken) {
      return { ok: false, error: "這個動物頭像已被選走，換一個吧" };
    }

    room.players.push({
      id: playerId,
      name: trimmed,
      avatar,
      score: 0,
      connected: true,
      answers: {},
    });
    return { ok: true, room };
  }

  rejoin(
    code: string,
    id: string,
    role: "host" | "player"
  ): { ok: true; room: Room } | { ok: false; error: string } {
    const room = this.get(code);
    if (!room) return { ok: false, error: "找不到房間" };
    if (role === "host") {
      if (room.hostId !== id) return { ok: false, error: "Host 身分不符" };
      return { ok: true, room };
    }
    const player = room.players.find((p) => p.id === id);
    if (!player) return { ok: false, error: "找不到玩家" };
    player.connected = true;
    return { ok: true, room };
  }

  setQuestions(code: string, hostId: string, questions: Question[]) {
    const room = this.get(code);
    if (!room) return { ok: false as const, error: "找不到房間" };
    if (room.hostId !== hostId) return { ok: false as const, error: "無權限" };
    if (room.phase !== "lobby") return { ok: false as const, error: "遊戲進行中無法改題" };
    if (!questions.length) return { ok: false as const, error: "至少需要一題" };
    room.questions = questions.map((q) => ({ ...q }));
    return { ok: true as const, room };
  }

  kick(code: string, hostId: string, playerId: string) {
    const room = this.get(code);
    if (!room) return { ok: false as const, error: "找不到房間" };
    if (room.hostId !== hostId) return { ok: false as const, error: "無權限" };
    if (room.phase !== "lobby") return { ok: false as const, error: "遊戲進行中無法踢人" };
    room.players = room.players.filter((p) => p.id !== playerId);
    return { ok: true as const, room };
  }

  markDisconnected(
    socketRoomCode: string | undefined,
    socketId: string,
    meta?: { playerId?: string; hostId?: string }
  ) {
    if (!socketRoomCode) return;
    const room = this.get(socketRoomCode);
    if (!room) return;
    if (meta?.playerId) {
      const p = room.players.find((x) => x.id === meta.playerId);
      if (p) p.connected = false;
    }
    void socketId;
  }

  startQuestion(room: Room, index: number, onTimeout: () => void) {
    if (room.timer) clearTimeout(room.timer);
    const q = room.questions[index];
    if (!q) return;

    room.currentIndex = index;
    room.phase = "answering";
    const limitMs = q.timeLimitSec * 1000;
    room.questionEndsAt = Date.now() + limitMs;
    room.timer = setTimeout(onTimeout, limitMs);
  }

  submitAnswer(code: string, playerId: string, choice: number) {
    const room = this.get(code);
    if (!room) return { ok: false as const, error: "找不到房間" };
    if (room.phase !== "answering") return { ok: false as const, error: "目前無法作答" };

    const q = room.questions[room.currentIndex];
    if (!q) return { ok: false as const, error: "沒有題目" };

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { ok: false as const, error: "找不到玩家" };
    if (player.answers[q.id]) return { ok: false as const, error: "已經作答過了" };
    if (choice < 0 || choice > 3) return { ok: false as const, error: "選項無效" };

    const now = Date.now();
    const endsAt = room.questionEndsAt ?? now;
    const remainingMs = Math.max(0, endsAt - now);
    const correct = choice === q.correctIndex;
    const pointsEarned = correct
      ? calcPointsEarned(q.points, remainingMs, q.timeLimitSec * 1000)
      : 0;

    player.answers[q.id] = { choice, answeredAt: now, pointsEarned };
    if (correct) player.score += pointsEarned;

    const allAnswered = room.players.every((p) => Boolean(p.answers[q.id]));
    return { ok: true as const, room, allAnswered };
  }

  reveal(room: Room) {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
    room.phase = "reveal";
    room.questionEndsAt = null;
  }

  finish(room: Room) {
    if (room.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
    room.phase = "final";
    room.questionEndsAt = null;
  }

  buildReveal(room: Room): RevealEntry[] {
    const q = room.questions[room.currentIndex];
    if (!q) return [];
    return room.players
      .map((p) => {
        const ans = p.answers[q.id];
        return {
          playerId: p.id,
          name: p.name,
          avatar: p.avatar,
          choice: ans ? ans.choice : null,
          correct: ans ? ans.choice === q.correctIndex : false,
          pointsEarned: ans?.pointsEarned ?? 0,
          score: p.score,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  toState(room: Room, opts: { forHost: boolean } = { forHost: false }): RoomState {
    const includeCorrect = room.phase === "reveal" || room.phase === "final";
    const q = room.currentIndex >= 0 ? room.questions[room.currentIndex] : null;
    const answeredCount = q
      ? room.players.filter((p) => Boolean(p.answers[q.id])).length
      : 0;

    const stripAudioUrl = !opts.forHost;
    const showCurrent =
      room.phase === "answering" || room.phase === "reveal" || room.phase === "final";

    // Never send full question bank to challengers (prevents peeking in lobby).
    const questions: QuestionPublic[] = opts.forHost
      ? room.questions.map((question) =>
          toPublicQuestion(question, includeCorrect && room.phase === "final", {
            stripAudioUrl: false,
          })
        )
      : [];

    return {
      code: room.code,
      hostId: room.hostId,
      phase: room.phase,
      currentIndex: room.currentIndex,
      questionEndsAt: room.questionEndsAt,
      answeredCount,
      playerCount: room.players.length,
      maxPlayers: MAX_PLAYERS,
      questionCount: room.questions.length,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        connected: p.connected,
        hasAnswered: q ? Boolean(p.answers[q.id]) : false,
      })),
      questions,
      currentQuestion:
        showCurrent && q
          ? toPublicQuestion(q, includeCorrect, { stripAudioUrl })
          : null,
      reveal:
        room.phase === "reveal" || room.phase === "final" ? this.buildReveal(room) : null,
      leaderboard: [...room.players]
        .sort((a, b) => b.score - a.score)
        .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score })),
    };
  }
}
