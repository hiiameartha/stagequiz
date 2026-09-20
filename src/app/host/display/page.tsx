"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AvatarBadge } from "@/components/Avatar";
import { Leaderboard, RevealBoard } from "@/components/Leaderboard";
import { OptionGrid } from "@/components/OptionGrid";
import { QuestionMedia } from "@/components/QuestionMedia";
import { RankingChart } from "@/components/RankingChart";
import { Timer } from "@/components/Timer";
import { getOrCreateId, useQuizSocket } from "@/lib/socket";

function DisplayInner() {
  const params = useSearchParams();
  const { socket, connected, state } = useQuizSocket();
  const [hostId] = useState(() =>
    typeof window === "undefined" ? "" : getOrCreateId("quiz-host-id")
  );
  const codeParam = params.get("code") || "";
  const rejoinedRef = useRef(false);

  useEffect(() => {
    if (!connected || !hostId || rejoinedRef.current) return;
    const code = codeParam || localStorage.getItem("quiz-host-code") || "";
    if (!code || !socket.current) return;
    rejoinedRef.current = true;
    socket.current.emit("room:rejoin", {
      code,
      playerId: hostId,
      role: "host",
    });
  }, [connected, hostId, codeParam, socket]);

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-white/50">{connected ? "等待房間狀態…" : "連線中…"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-10">
      <header className="animate-fade-up flex items-end justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-amber-300/70">
            StageQuiz
          </p>
          <h1 className="font-display text-5xl text-amber-100">
            {state.phase === "lobby" && "等待挑戰者"}
            {state.phase === "answering" && `第 ${state.currentIndex + 1} 題`}
            {state.phase === "reveal" && "答案公布"}
            {state.phase === "final" && "最終名次"}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/50">房號</p>
          <p className="font-display text-4xl tracking-[0.2em] text-amber-200">
            {state.code}
          </p>
        </div>
      </header>

      {state.phase === "lobby" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="animate-fade-up rounded-3xl bg-black/30 p-8 ring-1 ring-white/10">
            <p className="text-white/60">挑戰者請至手機加入</p>
            <p className="mt-4 font-display text-7xl tracking-[0.2em] text-amber-200">
              {state.code}
            </p>
            <p className="mt-6 text-2xl text-white/80">
              {state.playerCount} / {state.maxPlayers} 人
            </p>
            <p className="mt-2 text-white/40">共 {state.questionCount} 題（內容保密）</p>
          </div>
          <div className="animate-fade-up space-y-3" style={{ animationDelay: "80ms" }}>
            <h3 className="font-display text-lg text-amber-200">動物小隊</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {state.players.map((p, i) => (
                <li
                  key={p.id}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className="animate-pop flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-3"
                >
                  <AvatarBadge avatar={p.avatar} />
                  <span className="truncate font-medium">{p.name}</span>
                </li>
              ))}
            </ul>
            {!state.players.length && (
              <p className="text-white/40">等待挑戰者選擇動物頭像加入…</p>
            )}
          </div>
        </div>
      )}

      {(state.phase === "answering" || state.phase === "reveal") &&
        state.currentQuestion && (
          <div className="animate-fade-up space-y-6" key={state.currentIndex}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="max-w-3xl font-display text-3xl leading-snug text-amber-50 md:text-4xl">
                {state.currentQuestion.text}
              </h2>
              {state.phase === "answering" && (
                <Timer endsAt={state.questionEndsAt} />
              )}
            </div>
            <QuestionMedia media={state.currentQuestion.media} large playAudio />
            <OptionGrid
              options={state.currentQuestion.options}
              correctIndex={state.currentQuestion.correctIndex}
              reveal={state.phase === "reveal"}
              disabled
              large
            />
            {state.phase === "answering" && (
              <p className="animate-pulse-soft text-center text-white/50">
                已交卷 {state.answeredCount}/{state.playerCount}
              </p>
            )}
            {state.phase === "reveal" && (
              <>
                <RevealBoard state={state} />
                <Leaderboard state={state} />
              </>
            )}
          </div>
        )}

      {state.phase === "final" && (
        <div className="rounded-3xl bg-black/35 p-8 ring-1 ring-amber-300/40">
          <RankingChart state={state} title="冠亞季軍＆全體名次" />
        </div>
      )}
    </main>
  );
}

export default function HostDisplayPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-white/50">
          載入展示屏…
        </main>
      }
    >
      <DisplayInner />
    </Suspense>
  );
}
