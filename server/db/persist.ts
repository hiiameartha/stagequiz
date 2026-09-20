import { desc, eq } from "drizzle-orm";
import type { Question } from "../../src/lib/quiz/types";
import type { Room } from "../room-manager";
import { getDb, isDbEnabled } from "./client";
import {
  matches,
  questionBanks,
  rooms,
  type LeaderboardEntry,
  type RoomSnapshot,
} from "./schema";

function roomToSnapshot(room: Room): RoomSnapshot {
  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    currentIndex: room.currentIndex,
    questionEndsAt: room.questionEndsAt,
    questions: room.questions.map((q) => ({ ...q })),
    players: room.players.map((p) => ({
      ...p,
      answers: { ...p.answers },
      connected: false,
    })),
  };
}

export async function saveQuestionBank(hostId: string, questions: Question[]) {
  const db = getDb();
  if (!db) return;
  try {
    await db
      .insert(questionBanks)
      .values({
        hostId,
        questions,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: questionBanks.hostId,
        set: { questions, updatedAt: new Date() },
      });
  } catch (e) {
    console.error("[db] saveQuestionBank failed", e);
  }
}

export async function loadQuestionBank(hostId: string): Promise<Question[] | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(questionBanks)
      .where(eq(questionBanks.hostId, hostId))
      .limit(1);
    return rows[0]?.questions ?? null;
  } catch (e) {
    console.error("[db] loadQuestionBank failed", e);
    return null;
  }
}

export async function saveRoom(room: Room) {
  const db = getDb();
  if (!db) return;
  const snap = roomToSnapshot(room);
  try {
    await db
      .insert(rooms)
      .values({
        code: snap.code,
        hostId: snap.hostId,
        phase: snap.phase,
        currentIndex: snap.currentIndex,
        questionEndsAt:
          snap.questionEndsAt != null ? new Date(snap.questionEndsAt) : null,
        questions: snap.questions,
        players: snap.players,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: rooms.code,
        set: {
          hostId: snap.hostId,
          phase: snap.phase,
          currentIndex: snap.currentIndex,
          questionEndsAt:
            snap.questionEndsAt != null ? new Date(snap.questionEndsAt) : null,
          questions: snap.questions,
          players: snap.players,
          updatedAt: new Date(),
        },
      });
  } catch (e) {
    console.error("[db] saveRoom failed", e);
  }
}

export async function loadRoomSnapshot(code: string): Promise<RoomSnapshot | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(rooms)
      .where(eq(rooms.code, code.toUpperCase()))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      code: row.code,
      hostId: row.hostId,
      phase: row.phase,
      currentIndex: row.currentIndex,
      questionEndsAt: row.questionEndsAt ? row.questionEndsAt.getTime() : null,
      questions: row.questions,
      players: row.players.map((p) => ({ ...p, connected: false })),
    };
  } catch (e) {
    console.error("[db] loadRoomSnapshot failed", e);
    return null;
  }
}

export async function saveMatch(input: {
  code: string;
  hostId: string;
  leaderboard: LeaderboardEntry[];
  questionCount: number;
}) {
  const db = getDb();
  if (!db) return;
  try {
    await db.insert(matches).values({
      code: input.code,
      hostId: input.hostId,
      leaderboard: input.leaderboard,
      questionCount: input.questionCount,
      finishedAt: new Date(),
    });
  } catch (e) {
    console.error("[db] saveMatch failed", e);
  }
}

export type MatchSummary = {
  id: string;
  code: string;
  finishedAt: string;
  questionCount: number;
  leaderboard: LeaderboardEntry[];
};

export async function listMatchesForHost(
  hostId: string,
  limit = 10
): Promise<MatchSummary[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select()
      .from(matches)
      .where(eq(matches.hostId, hostId))
      .orderBy(desc(matches.finishedAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      finishedAt: r.finishedAt.toISOString(),
      questionCount: r.questionCount,
      leaderboard: r.leaderboard,
    }));
  } catch (e) {
    console.error("[db] listMatchesForHost failed", e);
    return [];
  }
}

export { isDbEnabled };
