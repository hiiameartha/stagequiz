"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarBadge } from "@/components/Avatar";
import { Panel } from "@/components/ui";
import {
  type AvatarId,
  type RoomState,
} from "@/lib/quiz/types";

export type RaceEntry = {
  id: string;
  name: string;
  avatar: AvatarId;
  fromScore: number;
  toScore: number;
};

type Mood = "neutral" | "surge" | "slump" | "crown";

type LiveRacer = RaceEntry & {
  displayScore: number;
  rank: number;
  mood: Mood;
};

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * 公布：本題前 → 本題後（看得出超車）。
 * 最終：一律 0 → 總分（不重用 reveal，否則只剩上一題的微小加分）。
 */
export function raceEntriesFromState(state: RoomState): RaceEntry[] {
  if (state.phase === "reveal" && state.reveal?.length) {
    return state.reveal.map((r) => ({
      id: r.playerId,
      name: r.name,
      avatar: r.avatar,
      fromScore: Math.max(0, r.score - r.pointsEarned),
      toScore: r.score,
    }));
  }
  return state.leaderboard.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    fromScore: 0,
    toScore: p.score,
  }));
}

function ranksByScore(scores: Map<string, number>, ids: string[]) {
  const sorted = [...ids].sort((a, b) => {
    const diff = (scores.get(b) ?? 0) - (scores.get(a) ?? 0);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });
  const ranks = new Map<string, number>();
  sorted.forEach((id, i) => ranks.set(id, i + 1));
  return ranks;
}

export function ScoreRace({
  state,
  highlightId,
  title = "衝分排名",
  large = false,
  durationMs = 3400,
}: {
  state: RoomState;
  highlightId?: string;
  title?: string;
  large?: boolean;
  durationMs?: number;
}) {
  const entries = useMemo(() => raceEntriesFromState(state), [state]);
  const raceKey = useMemo(
    () =>
      entries.map((e) => `${e.id}:${e.fromScore}->${e.toScore}`).join("|") +
      `:${state.phase}:${state.currentIndex}`,
    [entries, state.phase, state.currentIndex]
  );

  const maxScore = Math.max(1, ...entries.map((e) => e.toScore));
  const [racers, setRacers] = useState<LiveRacer[]>([]);
  const [settled, setSettled] = useState(false);
  const moodsRef = useRef<Map<string, Mood>>(new Map());
  const moodTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    const timers = moodTimers.current;
    timers.forEach(clearTimeout);
    timers.clear();
    moodsRef.current = new Map();
    setSettled(false);

    const runEntries = entriesRef.current;
    if (!runEntries.length) {
      setRacers([]);
      return;
    }

    // 超車／被超邊框與標籤：僅本題公布；最終總分只衝高度、結束冠軍高亮
    const allowOvertakeFx = state.phase === "reveal";

    const ids = runEntries.map((e) => e.id);
    const startScores = new Map(runEntries.map((e) => [e.id, e.fromScore]));
    const startRanks = ranksByScore(startScores, ids);
    const prevRanks = new Map(startRanks);

    const publish = (
      scores: Map<string, number>,
      ranks: Map<string, number>
    ) => {
      setRacers(
        runEntries.map((e) => ({
          ...e,
          displayScore: scores.get(e.id) ?? e.fromScore,
          rank: ranks.get(e.id) ?? 1,
          mood: moodsRef.current.get(e.id) ?? "neutral",
        }))
      );
    };

    publish(startScores, startRanks);

    const flashMood = (id: string, mood: Mood, ms = 950) => {
      const existing = timers.get(id);
      if (existing) clearTimeout(existing);
      moodsRef.current.set(id, mood);
      setRacers((list) =>
        list.map((r) => (r.id === id ? { ...r, mood } : r))
      );
      timers.set(
        id,
        setTimeout(() => {
          if (moodsRef.current.get(id) === mood) {
            moodsRef.current.set(id, "neutral");
            setRacers((list) =>
              list.map((r) =>
                r.id === id && r.mood === mood ? { ...r, mood: "neutral" } : r
              )
            );
          }
          timers.delete(id);
        }, ms)
      );
    };

    let raf = 0;
    let running = true;
    // 等下一幀再開跑，讓 height:0 先上屏，CSS／視覺才能看出由下往上
    raf = requestAnimationFrame(() => {
      const t0 = performance.now();

      const tick = (now: number) => {
        if (!running) return;
        const t = Math.min(1, (now - t0) / durationMs);
        const eased = easeOutCubic(t);
        const scores = new Map<string, number>();

        for (const e of runEntries) {
          scores.set(e.id, e.fromScore + (e.toScore - e.fromScore) * eased);
        }
        const rankScores = new Map(
          [...scores.entries()].map(([id, v]) => [id, Math.round(v)])
        );
        const ranks = ranksByScore(rankScores, ids);

        if (allowOvertakeFx) {
          for (const id of ids) {
            const next = ranks.get(id) ?? 1;
            const prev = prevRanks.get(id) ?? next;
            if (next < prev) flashMood(id, "surge");
            if (next > prev) flashMood(id, "slump");
            prevRanks.set(id, next);
          }
        } else {
          for (const id of ids) {
            prevRanks.set(id, ranks.get(id) ?? 1);
          }
        }

        publish(scores, ranks);

        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          setSettled(true);
          let winnerId = runEntries[0]?.id;
          let best = -1;
          for (const e of runEntries) {
            if (e.toScore > best) {
              best = e.toScore;
              winnerId = e.id;
            }
          }
          if (winnerId && best > 0) flashMood(winnerId, "crown", 2400);
        }
      };

      raf = requestAnimationFrame(tick);
    });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [raceKey, durationMs, state.phase]);

  const sorted = [...racers].sort((a, b) => a.rank - b.rank);
  const chartH = large ? "h-64 md:h-80" : "h-48 md:h-56";
  // 固定欄寬：2 人或 20 人柱寬一致，人多則橫向捲動
  const colPx = large ? 56 : 44;
  const gapPx = large ? 10 : 6;

  if (!entries.length) {
    return (
      <Panel className="animate-fade-up" padding="md">
        {title ? (
          <h3 className="mb-3 font-display text-lg text-ink">{title}</h3>
        ) : null}
        <p className="text-sm text-muted">尚無成績</p>
      </Panel>
    );
  }

  return (
    <Panel className="animate-fade-up overflow-hidden" padding="md">
      {title ? (
        <div className="mb-4 flex items-end justify-between gap-3">
          <h3
            className={`font-display text-ink ${large ? "text-2xl" : "text-lg"}`}
          >
            {title}
          </h3>
          <p className="text-xs text-faint">
            {settled ? "結果出爐" : "分數衝刺中…"}
          </p>
        </div>
      ) : null}

      <div className="-mx-1 overflow-x-auto pb-1">
        <div
          className={`flex items-stretch justify-center ${chartH} px-1`}
          style={{
            gap: gapPx,
            width: Math.max(sorted.length, 1) * (colPx + gapPx) - gapPx,
            minWidth: "100%",
            marginInline: "auto",
          }}
        >
          {sorted.map((r) => {
            const ratio =
              maxScore <= 0
                ? 0
                : Math.max(0, Math.min(1, r.displayScore / maxScore));
            const isMe = r.id === highlightId;
            const moodClass =
              r.mood === "surge"
                ? "is-surge"
                : r.mood === "slump"
                  ? "is-slump"
                  : r.mood === "crown"
                    ? "is-crown"
                    : "";

            return (
              <div
                key={r.id}
                className={`score-race-col relative flex shrink-0 flex-col ${moodClass}`}
                style={{ width: colPx, minWidth: colPx, maxWidth: colPx }}
              >
                <div className="mb-1 flex min-h-[2.75rem] shrink-0 flex-col items-center justify-end gap-0.5">
                  <span
                    className={`font-display tabular-nums text-ink ${
                      large ? "text-lg md:text-xl" : "text-sm"
                    }`}
                  >
                    {Math.round(r.displayScore)}
                  </span>
                  {r.mood === "surge" && (
                    <span
                      className="score-race-tag score-race-tag-up"
                      aria-hidden
                    >
                      超車！
                    </span>
                  )}
                  {r.mood === "slump" && (
                    <span
                      className="score-race-tag score-race-tag-down"
                      aria-hidden
                    >
                      被超了…
                    </span>
                  )}
                </div>

                <div className="relative min-h-0 w-full flex-1">
                  <div
                    className="score-race-bar absolute inset-x-0 bottom-0 origin-bottom overflow-hidden rounded-t-xl"
                    style={{
                      height: "100%",
                      transform: `scaleY(${Math.max(0.03, ratio)})`,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#333237] via-[#fe811f] to-[#ffb06a]" />
                    <div className="score-race-shine absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/35 to-transparent" />
                  </div>
                </div>

                <div className="mt-2 flex w-full shrink-0 flex-col items-center gap-1">
                  <span className="font-display text-sm text-ink">{r.rank}</span>
                  <span className="relative inline-flex">
                    <AvatarBadge
                      avatar={r.avatar}
                      size={large ? "md" : "sm"}
                      className={
                        r.mood === "surge" ? "animate-bounce-soft" : undefined
                      }
                    />
                    {r.rank <= 3 && (
                      <span
                        className={`pointer-events-none absolute -right-1 -top-1 leading-none drop-shadow-sm ${
                          large ? "text-base" : "text-sm"
                        }`}
                        aria-label={
                          r.rank === 1
                            ? "冠軍"
                            : r.rank === 2
                              ? "亞軍"
                              : "季軍"
                        }
                      >
                        {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : "🥉"}
                      </span>
                    )}
                  </span>
                  <p
                    className={`w-full truncate text-center text-xs ${
                      isMe
                        ? "font-semibold text-[var(--orange-deep)]"
                        : "text-muted"
                    }`}
                    title={r.name}
                  >
                    {large ? r.name : r.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
