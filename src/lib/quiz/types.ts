export type Phase = "lobby" | "answering" | "reveal" | "final";

export type MediaType = "image" | "audio";

export type Media = {
  type: MediaType;
  url: string;
};

export type Question = {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  media?: Media;
  timeLimitSec: number;
  points: number;
};

export type PlayerAnswer = {
  choice: number;
  answeredAt: number;
  pointsEarned: number;
};

/** 頭像：emoji 字元，或舊版 slug（如 fox） */
export type AvatarId = string;

export type Player = {
  id: string;
  name: string;
  avatar: AvatarId;
  score: number;
  connected: boolean;
  answers: Record<string, PlayerAnswer>;
};

export type QuestionPublic = Omit<Question, "correctIndex"> & {
  correctIndex?: 0 | 1 | 2 | 3;
};

export type RevealEntry = {
  playerId: string;
  name: string;
  avatar: AvatarId;
  choice: number | null;
  correct: boolean;
  pointsEarned: number;
  score: number;
};

export type PublicPlayer = {
  id: string;
  name: string;
  avatar: AvatarId;
  score: number;
  connected: boolean;
  hasAnswered: boolean;
};

export type RoomState = {
  code: string;
  hostId: string;
  phase: Phase;
  currentIndex: number;
  questionEndsAt: number | null;
  answeredCount: number;
  playerCount: number;
  maxPlayers: number;
  questionCount: number;
  players: PublicPlayer[];
  /** Host only: full bank. Players get [] until needed. */
  questions: QuestionPublic[];
  currentQuestion: QuestionPublic | null;
  reveal: RevealEntry[] | null;
  leaderboard: Array<{ id: string; name: string; avatar: AvatarId; score: number }>;
};

export const MAX_PLAYERS = 20;
export const OPTION_LABELS = ["A", "B", "C", "D"] as const;

/** 舊版以 slug 存頭像；新版直接存 emoji */
const LEGACY_AVATAR_EMOJI: Record<string, string> = {
  fox: "🦊",
  cat: "🐱",
  dog: "🐶",
  panda: "🐼",
  rabbit: "🐰",
  owl: "🦉",
  lion: "🦁",
  bear: "🐻",
  frog: "🐸",
  penguin: "🐧",
  koala: "🐨",
  tiger: "🐯",
  unicorn: "🦄",
  dragon: "🐲",
  whale: "🐳",
  chick: "🐥",
};

export const DEFAULT_AVATAR: AvatarId = "🦊";

export function avatarEmoji(id: AvatarId | undefined): string {
  if (!id) return DEFAULT_AVATAR;
  return LEGACY_AVATAR_EMOJI[id] ?? id;
}

/** 允許舊 slug，或最多 4 個字素的 emoji 字串 */
export function isAvatarId(v: string): v is AvatarId {
  if (!v || /\s/.test(v) || v.length > 24) return false;
  if (v in LEGACY_AVATAR_EMOJI) return true;
  if (/[\u0000-\u001F\u007F]/.test(v)) return false;
  const graphemes =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(v)]
          .length
      : [...v].length;
  return graphemes >= 1 && graphemes <= 4;
}

export type MatchSummary = {
  id: string;
  code: string;
  finishedAt: string;
  questionCount: number;
  leaderboard: Array<{ id: string; name: string; avatar: AvatarId; score: number }>;
};

export type ClientToServerEvents = {
  "room:create": (
    payload: { hostId: string; questions?: Question[] },
    ack?: (res: { ok: true; code: string } | { ok: false; error: string }) => void
  ) => void;
  "room:join": (
    payload: { code: string; playerId: string; name: string; avatar: AvatarId },
    ack?: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "room:rejoin": (
    payload: { code: string; playerId: string; role: "host" | "player" },
    ack?: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "host:setQuestions": (
    payload: { code: string; hostId: string; questions: Question[] },
    ack?: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "host:loadBank": (
    payload: { hostId: string },
    ack?: (
      res:
        | { ok: true; questions: Question[] | null }
        | { ok: false; error: string }
    ) => void
  ) => void;
  "host:saveBank": (
    payload: { hostId: string; questions: Question[] },
    ack?: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "host:listMatches": (
    payload: { hostId: string },
    ack?: (
      res: { ok: true; matches: MatchSummary[] } | { ok: false; error: string }
    ) => void
  ) => void;
  "host:start": (
    payload: { code: string; hostId: string },
    ack?: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "host:next": (
    payload: { code: string; hostId: string },
    ack?: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "host:forceReveal": (
    payload: { code: string; hostId: string },
    ack?: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "host:endGame": (
    payload: { code: string; hostId: string },
    ack?: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "host:startTimer": (
    payload: { code: string; hostId: string },
    ack?: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "host:kick": (
    payload: { code: string; hostId: string; playerId: string },
    ack?: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  "answer:submit": (
    payload: { code: string; playerId: string; choice: number },
    ack?: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
};

export type ServerToClientEvents = {
  "room:state": (state: RoomState) => void;
  "room:error": (payload: { error: string }) => void;
};
