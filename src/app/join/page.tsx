"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AvatarBadge, AvatarPicker } from "@/components/Avatar";
import { Leaderboard, RevealBoard } from "@/components/Leaderboard";
import { OptionGrid } from "@/components/OptionGrid";
import { QuestionMedia } from "@/components/QuestionMedia";
import { RankingChart } from "@/components/RankingChart";
import { Timer } from "@/components/Timer";
import { getOrCreateId, useQuizSocket, type QuizSocket } from "@/lib/socket";
import {
  isAvatarId,
  type AvatarId,
  type RoomState,
} from "@/lib/quiz/types";

function AnsweringPanel({
  state,
  code,
  playerId,
  socket,
  onError,
  onSubmitted,
}: {
  state: RoomState;
  code: string;
  playerId: string;
  socket: React.MutableRefObject<QuizSocket | null>;
  onError: (msg: string) => void;
  onSubmitted: (choice: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const q = state.currentQuestion!;

  function submit(choice: number) {
    if (!socket.current || submitted) return;
    setSelected(choice);
    socket.current.emit(
      "answer:submit",
      { code, playerId, choice },
      (res) => {
        if (!res?.ok) {
          onError(res?.error ?? "提交失敗");
          setSelected(null);
          return;
        }
        setSubmitted(true);
        onSubmitted(choice);
      }
    );
  }

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/50">
            第 {state.currentIndex + 1} / {state.questionCount} 題
          </p>
          <h2 className="mt-1 font-display text-xl text-amber-50">{q.text}</h2>
        </div>
        <Timer endsAt={state.questionEndsAt} />
      </div>
      <QuestionMedia media={q.media} playAudio={false} />
      {submitted || state.players.find((p) => p.id === playerId)?.hasAnswered ? (
        <p className="animate-pop rounded-2xl bg-emerald-500/10 p-4 text-center text-emerald-200 ring-1 ring-emerald-400/30">
          已提交，等待其他人…
        </p>
      ) : (
        <OptionGrid options={q.options} selected={selected} onSelect={submit} />
      )}
    </div>
  );
}

function JoinInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { socket, connected, state } = useQuizSocket();

  const [playerId] = useState(() =>
    typeof window === "undefined" ? "" : getOrCreateId("quiz-player-id")
  );
  const [code, setCode] = useState(() => {
    if (typeof window === "undefined") return params.get("code")?.toUpperCase() ?? "";
    const fromUrl = params.get("code")?.toUpperCase();
    if (fromUrl) return fromUrl;
    return localStorage.getItem("quiz-player-code") ?? "";
  });
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("quiz-player-name") ?? "";
  });
  const [avatar, setAvatar] = useState<AvatarId>(() => {
    if (typeof window === "undefined") return "fox";
    const saved = localStorage.getItem("quiz-player-avatar");
    return saved && isAvatarId(saved) ? saved : "fox";
  });
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [lastChoice, setLastChoice] = useState<number | null>(null);
  const rejoinedRef = useRef(false);

  useEffect(() => {
    if (!connected || !playerId || rejoinedRef.current) return;
    const savedCode = localStorage.getItem("quiz-player-code");
    if (!savedCode || !socket.current) return;
    rejoinedRef.current = true;
    socket.current.emit(
      "room:rejoin",
      { code: savedCode, playerId, role: "player" },
      (res) => {
        if (res?.ok) {
          setJoined(true);
          setCode(savedCode);
        } else {
          localStorage.removeItem("quiz-player-code");
          rejoinedRef.current = false;
        }
      }
    );
  }, [connected, playerId, socket]);

  function join() {
    if (!socket.current || !playerId) return;
    setError("");
    const normalized = code.trim().toUpperCase();
    socket.current.emit(
      "room:join",
      { code: normalized, playerId, name, avatar },
      (res) => {
        if (!res?.ok) {
          setError(res?.error ?? "加入失敗");
          return;
        }
        localStorage.setItem("quiz-player-code", normalized);
        localStorage.setItem("quiz-player-name", name.trim());
        localStorage.setItem("quiz-player-avatar", avatar);
        setJoined(true);
        setCode(normalized);
        rejoinedRef.current = true;
        router.replace(`/join?code=${normalized}`);
      }
    );
  }

  const me = state?.players.find((p) => p.id === playerId);
  const inRoom = Boolean(me);
  const showGame = Boolean(joined && state && (state.phase !== "lobby" || inRoom));
  const takenAvatars = (state?.players ?? [])
    .filter((p) => p.id !== playerId)
    .map((p) => p.avatar);

  if (!showGame || !state) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-10">
        <div className="animate-fade-up">
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300/70">
            Challenger
          </p>
          <h1 className="font-display text-4xl text-amber-100">加入競賽</h1>
        </div>
        {(error || (joined && state && !inRoom)) && (
          <p className="animate-pop rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
            {error || "你不在此房間（可能已被踢出），請重新加入"}
          </p>
        )}
        <label className="animate-fade-up block space-y-1" style={{ animationDelay: "60ms" }}>
          <span className="text-sm text-white/50">房號</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 font-display text-2xl tracking-[0.3em] outline-none focus:border-amber-300/50"
            placeholder="ABC123"
          />
        </label>
        <label className="animate-fade-up block space-y-1" style={{ animationDelay: "100ms" }}>
          <span className="text-sm text-white/50">暱稱</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-300/50"
            placeholder="你的名字"
          />
        </label>
        <div className="animate-fade-up" style={{ animationDelay: "140ms" }}>
          <AvatarPicker value={avatar} onChange={setAvatar} taken={takenAvatars} />
        </div>
        <button
          type="button"
          disabled={!connected || !code || !name.trim()}
          onClick={join}
          className="animate-fade-up rounded-2xl bg-amber-400 py-3 font-display text-lg text-ink hover:bg-amber-300 disabled:opacity-40"
          style={{ animationDelay: "180ms" }}
        >
          進入大廳
        </button>
        <Link href="/" className="text-center text-sm text-white/50 hover:text-white/80">
          回首頁
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8">
      <header className="animate-fade-up flex items-center justify-between">
        <div className="flex items-center gap-3">
          {me && <AvatarBadge avatar={me.avatar} size="lg" />}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300/70">
              {state.code}
            </p>
            <h1 className="font-display text-2xl text-amber-100">
              {me?.name ?? name}
            </h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/50">目前分數</p>
          <p className="font-display text-2xl tabular-nums text-amber-200">
            {me?.score ?? 0}
          </p>
        </div>
      </header>

      {error && (
        <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      {state.phase === "lobby" && (
        <div className="animate-fade-up space-y-4 rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
          <p className="text-center text-white/60">已進入大廳，等待 Host 開始…</p>
          <p className="text-center text-sm text-white/40">
            {state.playerCount}/{state.maxPlayers} 人 · 共 {state.questionCount} 題
            （題目內容暫不公開）
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {state.players.map((p, i) => (
              <li
                key={p.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`animate-pop flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm ${
                  p.id === playerId ? "ring-1 ring-amber-300/50" : ""
                }`}
              >
                <AvatarBadge avatar={p.avatar} size="sm" />
                <span className="truncate">{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.phase === "answering" && state.currentQuestion && (
        <AnsweringPanel
          key={state.currentIndex}
          state={state}
          code={code}
          playerId={playerId}
          socket={socket}
          onError={setError}
          onSubmitted={setLastChoice}
        />
      )}

      {state.phase === "reveal" && state.currentQuestion && (
        <div className="animate-fade-up space-y-4">
          <h2 className="font-display text-xl text-amber-50">
            {state.currentQuestion.text}
          </h2>
          <QuestionMedia media={state.currentQuestion.media} playAudio={false} />
          <OptionGrid
            options={state.currentQuestion.options}
            selected={lastChoice}
            correctIndex={state.currentQuestion.correctIndex}
            reveal
            disabled
          />
          <RevealBoard state={state} />
          <Leaderboard state={state} highlightId={playerId} />
        </div>
      )}

      {state.phase === "final" && (
        <div className="rounded-3xl bg-black/30 p-5 ring-1 ring-amber-300/30">
          <RankingChart state={state} highlightId={playerId} />
          <p className="mt-4 text-center text-white/50">
            你的分數：{me?.score ?? 0}
          </p>
        </div>
      )}
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center text-white/50">
          載入中…
        </main>
      }
    >
      <JoinInner />
    </Suspense>
  );
}
