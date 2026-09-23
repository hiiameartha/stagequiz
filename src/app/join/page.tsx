"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AvatarBadge, AvatarPicker } from "@/components/Avatar";
import { Leaderboard, RevealBoard } from "@/components/Leaderboard";
import { OptionGrid } from "@/components/OptionGrid";
import { QuestionMedia } from "@/components/QuestionMedia";
import { RankingChart } from "@/components/RankingChart";
import { Timer } from "@/components/Timer";
import {
  AccentLabel,
  Alert,
  Button,
  Chip,
  Field,
  FieldInput,
  Inset,
  Panel,
} from "@/components/ui";
import { getOrCreateId, useQuizSocket, type QuizSocket } from "@/lib/socket";
import {
  DEFAULT_AVATAR,
  isAvatarId,
  type AvatarId,
  type RoomState,
} from "@/lib/quiz/types";

function usePlayerId() {
  return useSyncExternalStore(
    () => () => {},
    () => getOrCreateId("quiz-player-id"),
    () => ""
  );
}

function useLocalStorageValue(key: string, fallback: string) {
  return useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem(key) ?? fallback,
    () => fallback
  );
}

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
  const waitingForMusic = state.questionEndsAt == null;

  function submit(choice: number) {
    if (!socket.current || submitted || waitingForMusic) return;
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
          <p className="text-sm text-muted">
            第 {state.currentIndex + 1} / {state.questionCount} 題
          </p>
          <h2 className="mt-1 font-display text-xl text-ink">{q.text}</h2>
        </div>
        <Timer
          endsAt={state.questionEndsAt}
          waitingLabel={waitingForMusic ? "等待播放" : undefined}
        />
      </div>
      <QuestionMedia media={q.media} playAudio={false} />
      {submitted || state.players.find((p) => p.id === playerId)?.hasAnswered ? (
        <Alert tone="success" className="animate-pop p-4 text-center font-semibold">
          已提交，等待其他人…
        </Alert>
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

  const playerId = usePlayerId();
  const urlCode = params.get("code")?.toUpperCase() ?? "";
  const savedCode = useLocalStorageValue("quiz-player-code", "");
  const savedName = useLocalStorageValue("quiz-player-name", "");
  const savedAvatarRaw = useLocalStorageValue("quiz-player-avatar", DEFAULT_AVATAR);
  const savedAvatar = isAvatarId(savedAvatarRaw) ? savedAvatarRaw : DEFAULT_AVATAR;

  const [codeDraft, setCodeDraft] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<AvatarId | null>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [lastChoice, setLastChoice] = useState<number | null>(null);
  const rejoinedRef = useRef(false);

  const code = codeDraft ?? (urlCode || savedCode);
  const name = nameDraft ?? savedName;
  const avatar = avatarDraft ?? savedAvatar;

  // 只在網址帶 ?code= 時自動重連（重整續玩）；純 /join 不強制進舊房
  useEffect(() => {
    if (!connected || !playerId || rejoinedRef.current) return;
    if (!urlCode || !socket.current) return;
    rejoinedRef.current = true;
    socket.current.emit(
      "room:rejoin",
      { code: urlCode, playerId, role: "player" },
      (res) => {
        if (res?.ok) {
          setJoined(true);
          setCodeDraft(urlCode);
          localStorage.setItem("quiz-player-code", urlCode);
        } else {
          localStorage.removeItem("quiz-player-code");
          rejoinedRef.current = false;
          setError(res?.error ?? "無法回到該房間，請重新加入");
          router.replace("/join");
        }
      }
    );
  }, [connected, playerId, socket, urlCode, router]);

  // 比賽結束後清掉房號，下次開啟不會自動回去
  useEffect(() => {
    if (state?.phase === "final") {
      localStorage.removeItem("quiz-player-code");
    }
  }, [state?.phase]);

  function clearRoomSession() {
    localStorage.removeItem("quiz-player-code");
    rejoinedRef.current = false;
    setJoined(false);
    setLastChoice(null);
    setError("");
    setCodeDraft("");
    router.replace("/join");
  }

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
        setCodeDraft(normalized);
        rejoinedRef.current = true;
        router.replace(`/join?code=${normalized}`);
      }
    );
  }

  const me = state?.players.find((p) => p.id === playerId);
  const inRoom = Boolean(me);
  const showGame = Boolean(joined && state && (state.phase !== "lobby" || inRoom));

  if (!showGame || !state) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-10">
        <div className="animate-fade-up">
          <AccentLabel>Challenger</AccentLabel>
          <h1 className="font-display text-4xl text-ink">加入競賽</h1>
        </div>
        {(error || (joined && state && !inRoom)) && (
          <Alert tone="error" className="animate-pop">
            {error || "你不在此房間（可能已被踢出），請重新加入"}
          </Alert>
        )}
        <Field
          label="房號"
          className="animate-fade-up"
          style={{ animationDelay: "60ms" }}
        >
          <FieldInput
            value={code}
            onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
            maxLength={6}
            className="px-4 py-3 font-display text-2xl tracking-[0.3em]"
            placeholder="ABC123"
          />
        </Field>
        <Field
          label="暱稱"
          className="animate-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          <FieldInput
            value={name}
            onChange={(e) => setNameDraft(e.target.value)}
            maxLength={20}
            className="px-4 py-3"
            placeholder="你的名字"
          />
        </Field>
        <div className="animate-fade-up" style={{ animationDelay: "140ms" }}>
          <AvatarPicker value={avatar} onChange={setAvatarDraft} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
          <Button
            disabled={!connected || !code || !name.trim()}
            onClick={join}
            variant="primary"
            size="lg"
            block
            display
          >
            進入大廳
          </Button>
        </div>
        <Button href="/" variant="ghost" size="sm" className="text-center">
          回首頁
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8">
      <header className="animate-fade-up flex items-center justify-between">
        <div className="flex items-center gap-3">
          {me && <AvatarBadge avatar={me.avatar} size="lg" />}
          <div>
            <AccentLabel className="text-xs">{state.code}</AccentLabel>
            <h1 className="font-display text-2xl text-ink">
              {me?.name ?? name}
            </h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">目前分數</p>
          <p className="font-display text-2xl tabular-nums text-ink">
            {me?.score ?? 0}
          </p>
        </div>
      </header>

      {error && <Alert tone="error">{error}</Alert>}

      {state.phase === "lobby" && (
        <Panel className="animate-fade-up space-y-4" padding="lg">
          <p className="text-center text-muted">已進入大廳，等待 Host 開始…</p>
          <p className="text-center text-sm text-faint">
            {state.playerCount}/{state.maxPlayers} 人 · 共 {state.questionCount} 題
            （題目內容暫不公開）
          </p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {state.players.map((p, i) => (
              <li key={p.id} style={{ animationDelay: `${i * 40}ms` }}>
                {p.id === playerId ? (
                  <Inset className="animate-pop flex items-center gap-2 px-3 py-2 text-sm">
                    <AvatarBadge avatar={p.avatar} size="sm" />
                    <span className="truncate">{p.name}</span>
                  </Inset>
                ) : (
                  <Chip className="animate-pop flex items-center gap-2 px-3 py-2 text-sm">
                    <AvatarBadge avatar={p.avatar} size="sm" />
                    <span className="truncate">{p.name}</span>
                  </Chip>
                )}
              </li>
            ))}
          </ul>
          <Button
            onClick={clearRoomSession}
            variant="ghost"
            size="sm"
            block
            className="text-muted"
          >
            離開並加入其他房間
          </Button>
        </Panel>
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
          <h2 className="font-display text-xl text-ink">
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
        <Panel padding="md">
          <RankingChart state={state} highlightId={playerId} />
          <p className="mt-4 text-center text-muted">
            你的分數：{me?.score ?? 0}
          </p>
          <Button
            onClick={clearRoomSession}
            variant="primary"
            size="lg"
            block
            display
            className="mt-6"
          >
            加入其他房間
          </Button>
        </Panel>
      )}
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center text-muted">
          載入中…
        </main>
      }
    >
      <JoinInner />
    </Suspense>
  );
}
