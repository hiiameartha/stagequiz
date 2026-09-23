"use client";

import { useEffect, useRef, useState } from "react";
import { AvatarBadge } from "@/components/Avatar";
import { Leaderboard, RevealBoard } from "@/components/Leaderboard";
import { OptionGrid } from "@/components/OptionGrid";
import { QuestionEditor } from "@/components/QuestionEditor";
import { QuestionMedia } from "@/components/QuestionMedia";
import { RankingChart } from "@/components/RankingChart";
import { Timer } from "@/components/Timer";
import {
  Alert,
  Button,
  Chip,
  PageHeader,
  Panel,
} from "@/components/ui";
import { SAMPLE_QUESTIONS } from "@/lib/quiz/sample-questions";
import { getOrCreateId, useQuizSocket } from "@/lib/socket";
import type { MatchSummary, Question } from "@/lib/quiz/types";
import { avatarEmoji } from "@/lib/quiz/types";
import { AnswerMediaPopup } from "@/components/AnswerMediaPopup";

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
  const cached = readCachedQuestions(hostId, code);
  return {
    hostId,
    code,
    questions: cached?.length ? cached : SAMPLE_QUESTIONS,
  };
}

function cacheQuestions(code: string, questions: Question[]) {
  localStorage.setItem(SHARED_BANK_CACHE_KEY, JSON.stringify(questions));
  if (code) {
    localStorage.setItem(`quiz-host-questions:${code}`, JSON.stringify(questions));
  }
}

function readCachedQuestions(hostId: string, code: string): Question[] | null {
  const bankSaved =
    localStorage.getItem(SHARED_BANK_CACHE_KEY) ??
    localStorage.getItem(`quiz-host-questions:bank:${hostId}`);
  if (bankSaved) {
    try {
      return JSON.parse(bankSaved) as Question[];
    } catch {
      /* ignore */
    }
  }
  if (code) {
    const savedQs = localStorage.getItem(`quiz-host-questions:${code}`);
    if (savedQs) {
      try {
        return JSON.parse(savedQs) as Question[];
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

export default function HostPage() {
  const { socket, connected, state } = useQuizSocket();
  // SSR-safe defaults — localStorage is applied after mount to avoid hydration mismatch
  const [hostId, setHostId] = useState("");
  const [code, setCode] = useState("");
  const [questions, setQuestions] = useState<Question[]>(SAMPLE_QUESTIONS);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveHint, setSaveHint] = useState("");
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const rejoinedRef = useRef(false);
  const bankLoadedRef = useRef(false);
  const matchesLoadedRef = useRef(false);

  useEffect(() => {
    const boot = loadHostBootstrap();
    setHostId(boot.hostId);
    setCode(boot.code);
    setQuestions(boot.questions);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !connected || !hostId || bankLoadedRef.current) return;
    if (!socket.current) return;
    bankLoadedRef.current = true;
    socket.current.emit("host:loadBank", { hostId }, (res) => {
      if (!res?.ok || !res.questions?.length) return;
      setQuestions(res.questions);
      cacheQuestions(code, res.questions);
    });
  }, [ready, connected, hostId, code, socket]);

  useEffect(() => {
    if (!ready || !connected || !hostId || matchesLoadedRef.current) return;
    if (!socket.current) return;
    matchesLoadedRef.current = true;
    socket.current.emit("host:listMatches", { hostId }, (res) => {
      if (res?.ok) setMatches(res.matches);
    });
  }, [ready, connected, hostId, socket]);

  useEffect(() => {
    if (!ready || !connected || !code || !hostId || rejoinedRef.current) return;
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
  }, [ready, connected, code, hostId, socket]);

  useEffect(() => {
    if (!ready || !questions.length) return;
    localStorage.setItem(SHARED_BANK_CACHE_KEY, JSON.stringify(questions));
  }, [ready, questions]);

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

  function leaveRoom() {
    localStorage.removeItem("quiz-host-code");
    setCode("");
    setError("");
    setSaveHint("");
    rejoinedRef.current = false;
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

  function endGame() {
    if (!socket.current || !code || !hostId) return;
    setError("");
    socket.current.emit("host:endGame", { code, hostId }, (res) => {
      if (!res?.ok) {
        setError(res?.error ?? "結束失敗");
        return;
      }
      refreshMatches();
    });
  }

  function kick(playerId: string) {
    if (!socket.current || !code || !hostId) return;
    socket.current.emit("host:kick", { code, hostId, playerId }, (res) => {
      if (!res?.ok) setError(res?.error ?? "踢出失敗");
    });
  }

  function startRoundTimer() {
    if (!socket.current || !code || !hostId) return;
    if (state?.questionEndsAt != null) return;
    socket.current.emit("host:startTimer", { code, hostId });
  }

  const inLobby = !state || state.phase === "lobby";
  const answering = state?.phase === "answering";
  const reveal = state?.phase === "reveal";
  const final = state?.phase === "final";
  const waitingForMusic = Boolean(answering && state && state.questionEndsAt == null);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <PageHeader
        eyebrow="Host"
        title="控場台"
        description={
          <>
            {connected ? "已連線" : "連線中…"}
            {code ? ` · 房號 ${code}` : ""}
          </>
        }
        actions={
          <>
            {code && (
              <Button
                href={`/host/display?code=${code}`}
                target="_blank"
                size="sm"
              >
                開啟展示屏
              </Button>
            )}
            <Button href="/" variant="ghost" size="sm">
              回首頁
            </Button>
          </>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      {!code && (
        <Panel as="section" padding="lg">
          <p className="mb-4 text-muted">
            題庫全站共用一份，可隨時存到雲端；之後再建立房間給挑戰者加入（最多 20 人）。
          </p>
          <QuestionEditor
            questions={questions}
            onChange={setQuestions}
            onSave={saveQuestions}
            saveDisabled={busy || !connected}
            saveHint={saveHint}
            onCreateRoom={createRoom}
            createDisabled={busy || !connected}
          />
        </Panel>
      )}

      {matches.length > 0 && (
        <Panel as="section" padding="md">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg text-ink">近期比賽</h2>
            <Button onClick={refreshMatches} variant="ghost" size="sm" className="text-xs">
              重新整理
            </Button>
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
                <li key={m.id}>
                  <Chip className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                    <div>
                      <span className="font-mono tracking-wider font-semibold text-ink">
                        {m.code}
                      </span>
                      <span className="ml-2 text-faint">{when}</span>
                      <span className="ml-2 text-faint">{m.questionCount} 題</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-muted">
                      {top.map((p, i) => (
                        <span key={p.id}>
                          {i + 1}.{avatarEmoji(p.avatar)} {p.name} {p.score}
                        </span>
                      ))}
                      {!top.length && <span className="text-faint">無玩家</span>}
                    </div>
                  </Chip>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {code && state && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="space-y-4">
            <Panel padding="md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">房號</p>
                  <p className="font-display text-5xl tracking-[0.2em] text-ink">
                    {state.code}
                  </p>
                </div>
                <div className="text-right text-sm text-muted">
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
                    <Button
                      onClick={startGame}
                      disabled={busy}
                      variant="primary"
                      size="md"
                      display
                    >
                      開始競賽
                    </Button>
                    <p className="w-full text-xs text-faint">
                      也可到展示屏操作開始競賽。題庫請用下方固定列儲存。
                    </p>
                  </>
                )}
                {answering && (
                  <Button
                    onClick={() => hostAction("host:forceReveal")}
                    variant="danger"
                    size="md"
                    display
                  >
                    提前公布
                  </Button>
                )}
                {reveal && (
                  <Button
                    onClick={() => hostAction("host:next")}
                    variant="accent"
                    size="md"
                    display
                  >
                    {state.currentIndex + 1 >= state.questionCount
                      ? "看最終名次"
                      : "下一題"}
                  </Button>
                )}
                {(answering || reveal) && (
                  <Button onClick={endGame} variant="ghost" size="md">
                    結束本局
                  </Button>
                )}
                {final && (
                  <button
                    type="button"
                    onClick={leaveRoom}
                    className="rounded-xl bg-amber-400 px-4 py-2 font-display text-ink hover:bg-amber-300"
                  >
                    返回編輯題庫
                  </button>
                )}
                {!inLobby && !final && (
                  <p className="w-full text-xs text-white/40">
                    比賽進行中無法改題；要改題庫請按上方「離開房間」。
                  </p>
                )}
              </div>
            </Panel>

            {inLobby && (
              <QuestionEditor
                questions={questions}
                onChange={setQuestions}
                disabled={false}
                onSave={saveQuestions}
                saveDisabled={busy}
                saveHint={saveHint}
              />
            )}

            {(answering || reveal) && state.currentQuestion && (
              <Panel className="animate-fade-up space-y-4" padding="md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted">
                      第 {state.currentIndex + 1} / {state.questionCount} 題
                    </p>
                    <h2 className="mt-1 font-display text-2xl text-ink">
                      {state.currentQuestion.text}
                    </h2>
                  </div>
                  {answering && (
                    <Timer
                      endsAt={state.questionEndsAt}
                      waitingLabel={waitingForMusic ? "等待播放" : undefined}
                    />
                  )}
                </div>
                <QuestionMedia
                  media={state.currentQuestion.media}
                  playAudio={answering}
                  onPlayStart={startRoundTimer}
                />
                <OptionGrid
                  options={state.currentQuestion.options}
                  correctIndex={state.currentQuestion.correctIndex}
                  reveal={reveal}
                  disabled
                  large
                />
                {reveal && <RevealBoard state={state} />}
              </Panel>
            )}

            {(answering || reveal) && (
              <AnswerMediaPopup
                state={state}
                media={state.currentQuestion?.media}
                onContinue={
                  reveal ? () => hostAction("host:next") : undefined
                }
                continueLabel={
                  state.currentIndex + 1 >= state.questionCount
                    ? "看最終名次"
                    : "下一題"
                }
              />
            )}

            {final && (
              <Panel padding="lg">
                <RankingChart state={state} />
              </Panel>
            )}
          </section>

          <aside className="space-y-4">
            <Panel padding="md">
              <h3 className="mb-3 font-display text-lg text-ink">挑戰者</h3>
              <ul className="space-y-2">
                {state.players.map((p, i) => (
                  <li key={p.id} style={{ animationDelay: `${i * 40}ms` }}>
                    <Chip className="animate-pop flex items-center justify-between px-3 py-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <AvatarBadge avatar={p.avatar} size="sm" />
                        <span className="truncate">{p.name}</span>
                        {!p.connected && (
                          <span className="ml-1 text-faint">離線</span>
                        )}
                        {answering && p.hasAnswered && (
                          <span className="ml-1 font-semibold text-[#2d7a4f]">
                            已交
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums text-muted">{p.score}</span>
                        {inLobby && (
                          <Button
                            onClick={() => kick(p.id)}
                            variant="ghost"
                            size="sm"
                            className="text-xs text-[#a33232]"
                          >
                            踢出
                          </Button>
                        )}
                      </span>
                    </Chip>
                  </li>
                ))}
                {!state.players.length && (
                  <li className="text-sm text-faint">等待挑戰者加入…</li>
                )}
              </ul>
            </Panel>
            <Leaderboard state={state} />
          </aside>
        </div>
      )}
    </main>
  );
}
