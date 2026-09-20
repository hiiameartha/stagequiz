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

export type AvatarId =
  | "fox"
  | "cat"
  | "dog"
  | "panda"
  | "rabbit"
  | "owl"
  | "lion"
  | "bear"
  | "frog"
  | "penguin"
  | "koala"
  | "tiger"
  | "unicorn"
  | "dragon"
  | "whale"
  | "chick";

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

export const AVATARS: Array<{ id: AvatarId; emoji: string; label: string }> = [
  { id: "fox", emoji: "🦊", label: "狐狸" },
  { id: "cat", emoji: "🐱", label: "貓咪" },
  { id: "dog", emoji: "🐶", label: "狗狗" },
  { id: "panda", emoji: "🐼", label: "熊貓" },
  { id: "rabbit", emoji: "🐰", label: "兔子" },
  { id: "owl", emoji: "🦉", label: "貓頭鷹" },
  { id: "lion", emoji: "🦁", label: "獅子" },
  { id: "bear", emoji: "🐻", label: "熊熊" },
  { id: "frog", emoji: "🐸", label: "青蛙" },
  { id: "penguin", emoji: "🐧", label: "企鵝" },
  { id: "koala", emoji: "🐨", label: "無尾熊" },
  { id: "tiger", emoji: "🐯", label: "老虎" },
  { id: "unicorn", emoji: "🦄", label: "獨角獸" },
  { id: "dragon", emoji: "🐲", label: "龍" },
  { id: "whale", emoji: "🐳", label: "鯨魚" },
  { id: "chick", emoji: "🐥", label: "小雞" },
];

export function avatarEmoji(id: AvatarId | undefined): string {
  return AVATARS.find((a) => a.id === id)?.emoji ?? "🦊";
}

export function isAvatarId(v: string): v is AvatarId {
  return AVATARS.some((a) => a.id === v);
}

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
