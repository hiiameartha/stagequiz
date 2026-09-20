import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { AvatarId, Phase, Player, Question } from "../../src/lib/quiz/types";

export type LeaderboardEntry = {
  id: string;
  name: string;
  avatar: AvatarId;
  score: number;
};

export const questionBanks = pgTable("question_banks", {
  /** 固定為 shared：全站共用一份題庫 */
  hostId: text("host_id").primaryKey(),
  questions: jsonb("questions").$type<Question[]>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rooms = pgTable("rooms", {
  code: text("code").primaryKey(),
  hostId: text("host_id").notNull(),
  phase: text("phase").$type<Phase>().notNull(),
  currentIndex: integer("current_index").notNull(),
  questionEndsAt: timestamp("question_ends_at", { withTimezone: true }),
  questions: jsonb("questions").$type<Question[]>().notNull(),
  players: jsonb("players").$type<Player[]>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable("matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull(),
  hostId: text("host_id").notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }).notNull().defaultNow(),
  leaderboard: jsonb("leaderboard").$type<LeaderboardEntry[]>().notNull(),
  questionCount: integer("question_count").notNull(),
});

export type RoomSnapshot = {
  code: string;
  hostId: string;
  phase: Phase;
  currentIndex: number;
  questionEndsAt: number | null;
  questions: Question[];
  players: Player[];
};
