"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AvatarBadge } from "@/components/Avatar";
import { Leaderboard, RevealBoard } from "@/components/Leaderboard";
import { OptionGrid } from "@/components/OptionGrid";
import { QuestionEditor } from "@/components/QuestionEditor";
import { QuestionMedia } from "@/components/QuestionMedia";
import { RankingChart } from "@/components/RankingChart";
import { Timer } from "@/components/Timer";
import { SAMPLE_QUESTIONS } from "@/lib/quiz/sample-questions";
import { getOrCreateId, useQuizSocket } from "@/lib/socket";
import type { MatchSummary, Question } from "@/lib/quiz/types";
import { avatarEmoji } from "@/lib/quiz/types";

const SHARED_BANK_CACHE_KEY = "quiz-host-questions:bank:shared";

function loadHostBootstrap(): {
  hostId: string;
  code: string;
  questions: Question[];
} {
  if (typeof window === "undefined") {
    return { hostId: "", code: "", questions: SAMPLE_QUESTIONS };
  }
  const hostId = getOrCreateId("quiz-host-id");
  const code = localStorage.getItem("quiz-host-code") ?? "";
  let questions = SAMPLE_QUESTIONS;

  const bankSaved =
    localStorage.getItem(SHARED_BANK_CACHE_KEY) ??
    localStorage.getItem(`quiz-host-questions:bank:${hostId}`);
  if (bankSaved) {
    try {
      questions = JSON.parse(bankSaved) as Question[];
    } catch {
      /* ignore */
    }
  } else if (code) {
    const savedQs = localStorage.getItem(`quiz-host-questions:${code}`);
    if (savedQs) {
      try {
        questions = JSON.parse(savedQs) as Question[];
      } catch {
        /* ignore */
      }
    }
  }
  return { hostId, code, questions };
}

function cacheQuestions(code: string, questions: Question[]) {
  localStorage.setItem(SHARED_BANK_CACHE_KEY, JSON.stringify(questions));
  if (code) {
    localStorage.setItem(`quiz-host-questions:${code}`, JSON.stringify(questions));
  }
}

export default function HostPage() {
  const { socket, connected, state } = useQuizSocket();
  const [boot] = useState(loadHostBootstrap);
  const [hostId] = useState(boot.hostId);
  const [code, setCode] = useState(boot.code);
  const [questions, setQuestions] = useState<Question[]>(boot.questions);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveHint, setSaveHint] = useState("");
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const rejoinedRef = useRef(false);
  const bankLoadedRef = useRef(false);
  const matchesLoadedRef = useRef(false);

  useEffect(() => {
    if (!connected || !hostId || bankLoadedRef.current) return;
    if (!socket.current) return;
    bankLoadedRef.current = true;
    socket.current.emit("host:loadBank", { hostId }, (res) => {
      if (!res?.ok || !res.questions?.length) return;
      setQuestions(res.questions);
      cacheQuestions(code, res.questions);
    });
  }, [connected, hostId, code, socket]);

  useEffect(() => {
    if (!connected || !hostId || matchesLoadedRef.current) return;
    if (!socket.current) return;
    matchesLoadedRef.current = true;
    socket.current.emit("host:listMatches", { hostId }, (res) => {
      if (res?.ok) setMatches(res.matches);
    });
  }, [connected, hostId, socket]);

  useEffect(() => {
    if (!connected || !code || !hostId || rejoinedRef.current) return;
    if (!socket.current) return;
    rejoinedRef.current = true;
    socket.current.emit(
      "room:rejoin",
      { code, playerId: hostId, role: "host" },
      (res) => {
        if (!res?.ok) {
          localStorage.removeItem("quiz-host-code");
          setCode("");
          rejoinedRef.current = false;
        }
      }
    );
  }, [connected, code, hostId, socket]);

  useEffect(() => {
    if (!questions.length) return;
    localStorage.setItem(SHARED_BANK_CACHE_KEY, JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    if (state?.phase !== "final" || !socket.current || !hostId) return;
    socket.current.emit("host:listMatches", { hostId }, (res) => {
      if (res?.ok) setMatches(res.matches);
    });
  }, [state?.phase, hostId, socket]);

  function refreshMatches() {
    if (!socket.current || !hostId) return;
    socket.current.emit("host:listMatches", { hostId }, (res) => {
      if (res?.ok) setMatches(res.matches);
    });
  }

  function createRoom() {
    if (!socket.current || !hostId) return;
    setBusy(true);
    setError("");
    socket.current.emit("room:create", { hostId, questions }, (res) => {
      setBusy(false);
      if (!res?.ok) {
        setError(res?.error ?? "建房失敗");
        return;
      }
      setCode(res.code);
      localStorage.setItem("quiz-host-code", res.code);
      cacheQuestions(res.code, questions);
      rejoinedRef.current = true;
    });
  }

  function saveQuestions() {
    if (!socket.current || !hostId) return;
    if (!questions.length) {
      setError("至少需要一題");
      return;
    }
    setBusy(true);
    setError("");
    setSaveHint("");
    socket.current.emit(
      "host:saveBank",
      { hostId, questions },
      async (res) => {
        if (!res?.ok) {
          setBusy(false);
          setError(res?.error ?? "儲存失敗");
          return;
        }
        cacheQuestions(code, questions);

        // 若已在大廳房間，一併同步該場次題目
        if (code && (!state || state.phase === "lobby")) {
          const roomRes = await new Promise<
            { ok: true } | { ok: false; error: string }
          >((resolve) => {
            socket.current!.emit(
              "host:setQuestions",
              { code, hostId, questions },
              (r) => resolve(r ?? { ok: false, error: "同步房間失敗" })
            );
          });
          setBusy(false);
          if (!roomRes.ok) {
            setError(roomRes.error);
            return;
          }
        } else {
          setBusy(false);
        }
        setSaveHint("題庫已存到雲端");
        window.setTimeout(() => setSaveHint(""), 2500);
      }
    );
  }

  async function startGame() {
    if (!socket.current || !code || !hostId) return;
    setError("");
    setBusy(true);
    const saveRes = await new Promise<{ ok: true } | { ok: false; error: string }>(
      (resolve) => {
        socket.current!.emit(
          "host:setQuestions",
          { code, hostId, questions },
          (res) => resolve(res ?? { ok: false, error: "儲存失敗" })
        );
      }
    );
    if (!saveRes.ok) {
      setBusy(false);
      setError(saveRes.error);
      return;
    }
    cacheQuestions(code, questions);
    socket.current.emit("host:start", { code, hostId }, (res) => {
      setBusy(false);
      if (!res?.ok) setError(res?.error ?? "開始失敗");
    });
  }

  function hostAction(event: "host:next" | "host:forceReveal") {
    if (!socket.current || !code || !hostId) return;
    setError("");
    socket.current.emit(event, { code, hostId }, (res) => {
      if (!res?.ok) setError(res?.error ?? "操作失敗");
      if (event === "host:next") refreshMatches();
    });
  }

  function kick(playerId: string) {
    if (!socket.current || !code || !hostId) return;
    socket.current.emit("host:kick", { code, hostId, playerId }, (res) => {
      if (!res?.ok) setError(res?.error ?? "踢出失敗");
    });
  }

  const inLobby = !state || state.phase === "lobby";
  const answering = state?.phase === "answering";
  const reveal = state?.phase === "reveal";
  const final = state?.phase === "final";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-300/70">Host</p>
          <h1 className="font-display text-4xl text-amber-100">控場台</h1>
          <p className="mt-1 text-sm text-white/50">
            {connected ? "已連線" : "連線中…"}
            {code ? ` · 房號 ${code}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {code && (
            <Link
              href={`/host/display?code=${code}`}
              target="_blank"
              className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              開啟展示屏
            </Link>
          )}
          <Link href="/" className="rounded-xl px-4 py-2 text-sm text-white/60 hover:text-white">
            回首頁
          </Link>
        </div>
      </header>

      {error && (
        <p className="rounded-xl bg-rose-500/15 px-4 py-2 text-sm text-rose-200 ring-1 ring-rose-400/30">
          {error}
        </p>
      )}

      {!code && (
        <section className="rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
          <p className="mb-4 text-white/70">
            題庫全站共用一份，可隨時存到雲端；之後再建立房間給挑戰者加入（最多 20 人）。
          </p>
          <QuestionEditor questions={questions} onChange={setQuestions} />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || !connected}
              onClick={saveQuestions}
              className="rounded-2xl bg-white/10 px-6 py-3 text-sm ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-40"
            >
              儲存題庫
            </button>
            <button
              type="button"
              disabled={busy || !connected}
              onClick={createRoom}
              className="rounded-2xl bg-amber-400 px-6 py-3 font-display text-lg text-ink hover:bg-amber-300 disabled:opacity-40"
            >
              建立房間
            </button>
            {saveHint && <span className="text-sm text-emerald-300/90">{saveHint}</span>}
          </div>
        </section>
      )}

      {matches.length > 0 && (
        <section className="rounded-3xl bg-black/30 p-5 ring-1 ring-white/10">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg text-amber-200">近期比賽</h2>
            <button
              type="button"
              onClick={refreshMatches}
              className="text-xs text-white/50 hover:text-white/80"
            >
              重新整理
            </button>
          </div>
          <ul className="space-y-3">
            {matches.map((m) => {
              const top = m.leaderboard.slice(0, 3);
              const when = new Date(m.finishedAt).toLocaleString("zh-TW", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-mono tracking-wider text-amber-100/90">{m.code}</span>
                    <span className="ml-2 text-white/40">{when}</span>
                    <span className="ml-2 text-white/40">{m.questionCount} 題</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-white/70">
                    {top.map((p, i) => (
                      <span key={p.id}>
                        {i + 1}.{avatarEmoji(p.avatar)} {p.name} {p.score}
                      </span>
                    ))}
                    {!top.length && <span className="text-white/40">無玩家</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {code && state && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="space-y-4">
            <div className="rounded-3xl bg-black/30 p-5 ring-1 ring-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white/50">房號</p>
                  <p className="font-display text-5xl tracking-[0.2em] text-amber-200">
                    {state.code}
                  </p>
                </div>
                <div className="text-right text-sm text-white/60">
                  <p>
                    挑戰者 {state.playerCount}/{state.maxPlayers}
                  </p>
                  <p>
                    階段：
                    {state.phase === "lobby" && "大廳"}
                    {state.phase === "answering" && "作答中"}
                    {state.phase === "reveal" && "公布答案"}
                    {state.phase === "final" && "最終名次"}
                  </p>
                  {answering && (
                    <p>
                      已交卷 {state.answeredCount}/{state.playerCount}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {inLobby && (
                  <>
                    <button
                      type="button"
                      onClick={saveQuestions}
                      disabled={busy}
                      className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                    >
                      儲存題庫
                    </button>
                    <button
                      type="button"
                      onClick={startGame}
                      disabled={busy}
                      className="rounded-xl bg-amber-400 px-4 py-2 font-display text-ink hover:bg-amber-300 disabled:opacity-40"
                    >
                      開始競賽
                    </button>
                    {saveHint && (
                      <span className="text-sm text-emerald-300/90">{saveHint}</span>
                    )}
                  </>
                )}
                {answering && (
                  <button
                    type="button"
                    onClick={() => hostAction("host:forceReveal")}
                    className="rounded-xl bg-rose-400/90 px-4 py-2 font-display text-white"
                  >
                    提前公布
                  </button>
                )}
                {reveal && (
                  <button
                    type="button"
                    onClick={() => hostAction("host:next")}
                    className="rounded-xl bg-amber-400 px-4 py-2 font-display text-ink"
                  >
                    {state.currentIndex + 1 >= state.questionCount
                      ? "看最終名次"
                      : "下一題"}
                  </button>
                )}
              </div>
            </div>

            {inLobby && (
              <QuestionEditor
                questions={questions}
                onChange={setQuestions}
                disabled={false}
              />
            )}

            {(answering || reveal) && state.currentQuestion && (
              <div className="animate-fade-up space-y-4 rounded-3xl bg-black/30 p-5 ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/50">
                      第 {state.currentIndex + 1} / {state.questionCount} 題
                    </p>
                    <h2 className="mt-1 font-display text-2xl text-amber-50">
                      {state.currentQuestion.text}
                    </h2>
                  </div>
                  {answering && <Timer endsAt={state.questionEndsAt} />}
                </div>
                <QuestionMedia media={state.currentQuestion.media} playAudio />
                <OptionGrid
                  options={state.currentQuestion.options}
                  correctIndex={state.currentQuestion.correctIndex}
                  reveal={reveal}
                  disabled
                  large
                />
                {reveal && <RevealBoard state={state} />}
              </div>
            )}

            {final && (
              <div className="rounded-3xl bg-black/30 p-6 ring-1 ring-amber-300/30">
                <RankingChart state={state} />
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl bg-black/30 p-5 ring-1 ring-white/10">
              <h3 className="mb-3 font-display text-lg text-amber-200">挑戰者</h3>
              <ul className="space-y-2">
                {state.players.map((p, i) => (
                  <li
                    key={p.id}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className="animate-pop flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <AvatarBadge avatar={p.avatar} size="sm" />
                      <span className="truncate">{p.name}</span>
                      {!p.connected && (
                        <span className="ml-1 text-white/40">離線</span>
                      )}
                      {answering && p.hasAnswered && (
                        <span className="ml-1 text-emerald-300/80">已交</span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums text-white/60">{p.score}</span>
                      {inLobby && (
                        <button
                          type="button"
                          onClick={() => kick(p.id)}
                          className="text-xs text-rose-300/80 hover:text-rose-200"
                        >
                          踢出
                        </button>
                      )}
                    </span>
                  </li>
                ))}
                {!state.players.length && (
                  <li className="text-sm text-white/40">等待挑戰者加入…</li>
                )}
              </ul>
            </div>
            <Leaderboard state={state} />
          </aside>
        </div>
      )}
    </main>
  );
}
