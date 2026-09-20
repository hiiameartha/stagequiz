"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AvatarBadge } from "@/components/Avatar";
import { Leaderboard, RevealBoard } from "@/components/Leaderboard";
import { OptionGrid } from "@/components/OptionGrid";
import { QuestionMedia } from "@/components/QuestionMedia";
import { AnswerMediaPopup } from "@/components/AnswerMediaPopup";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rejoinedRef = useRef(false);

  useEffect(() => {
    if (!connected || !hostId || rejoinedRef.current) return;
    const roomCode = codeParam || localStorage.getItem("quiz-host-code") || "";
    if (!roomCode || !socket.current) return;
    rejoinedRef.current = true;
    socket.current.emit("room:rejoin", {
      code: roomCode,
      playerId: hostId,
      role: "host",
    });
  }, [connected, hostId, codeParam, socket]);

  const code =
    codeParam ||
    (typeof window !== "undefined" ? localStorage.getItem("quiz-host-code") || "" : "");

  function startRoundTimer() {
    if (!socket.current || !hostId) return;
    const roomCode = state?.code || code;
    if (!roomCode || state?.questionEndsAt != null) return;
    socket.current.emit("host:startTimer", { code: roomCode, hostId });
  }

  function startGame() {
    if (!socket.current || !hostId) return;
    const roomCode = state?.code || code;
    if (!roomCode) return;
    setBusy(true);
    setError("");
    socket.current.emit("host:start", { code: roomCode, hostId }, (res) => {
      setBusy(false);
      if (!res?.ok) setError(res?.error ?? "開始失敗");
    });
  }

  function hostAction(event: "host:next" | "host:forceReveal") {
    if (!socket.current || !hostId) return;
    const roomCode = state?.code || code;
    if (!roomCode) return;
    setError("");
    socket.current.emit(event, { code: roomCode, hostId }, (res) => {
      if (!res?.ok) setError(res?.error ?? "操作失敗");
    });
  }

  const continueLabel =
    state && state.currentIndex + 1 >= state.questionCount
      ? "看最終名次"
      : "下一題";

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-white/50">{connected ? "等待房間狀態…" : "連線中…"}</p>
      </main>
    );
  }

  const waitingForMusic =
    state.phase === "answering" && state.questionEndsAt == null;

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

      {error && (
        <p className="rounded-2xl bg-rose-500/15 px-4 py-3 text-rose-200 ring-1 ring-rose-400/30">
          {error}
        </p>
      )}

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
            <button
              type="button"
              disabled={busy || !connected || state.playerCount < 1}
              onClick={startGame}
              className="mt-8 rounded-2xl bg-amber-400 px-8 py-4 font-display text-2xl text-ink hover:bg-amber-300 disabled:opacity-40"
            >
              開始競賽
            </button>
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
                <Timer
                  endsAt={state.questionEndsAt}
                  waitingLabel={waitingForMusic ? "等待播放" : undefined}
                />
              )}
            </div>
            <QuestionMedia
              media={state.currentQuestion.media}
              large
              playAudio={state.phase === "answering"}
              onPlayStart={startRoundTimer}
            />
            <OptionGrid
              options={state.currentQuestion.options}
              correctIndex={state.currentQuestion.correctIndex}
              reveal={state.phase === "reveal"}
              disabled
              large
            />
            {state.phase === "answering" && (
              <div className="flex flex-col items-center gap-3">
                <p className="animate-pulse-soft text-center text-white/50">
                  已交卷 {state.answeredCount}/{state.playerCount}
                </p>
                <button
                  type="button"
                  onClick={() => hostAction("host:forceReveal")}
                  className="rounded-xl bg-rose-400/90 px-5 py-2 font-display text-white"
                >
                  提前公布
                </button>
              </div>
            )}
            {state.phase === "reveal" && (
              <>
                <RevealBoard state={state} />
                <Leaderboard state={state} />
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => hostAction("host:next")}
                    className="rounded-2xl bg-amber-400 px-8 py-3 font-display text-xl text-ink hover:bg-amber-300"
                  >
                    {continueLabel}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      {state.phase === "reveal" && state.currentQuestion && (
        <AnswerMediaPopup
          media={state.currentQuestion.media}
          active
          onContinue={() => hostAction("host:next")}
          continueLabel={continueLabel}
        />
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
