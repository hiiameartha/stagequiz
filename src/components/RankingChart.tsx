"use client";

import { useEffect, useState } from "react";
import { AvatarBadge } from "@/components/Avatar";
import { avatarEmoji, type RoomState } from "@/lib/quiz/types";

export function RankingChart({
  state,
  highlightId,
  title = "最終名次",
}: {
  state: RoomState;
  highlightId?: string;
  title?: string;
}) {
  const [ready, setReady] = useState(false);
  const max = Math.max(1, ...state.leaderboard.map((p) => p.score));

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [state.leaderboard]);

  const podium = state.leaderboard.slice(0, 3);
  const rest = state.leaderboard.slice(3);

  return (
    <div className="animate-fade-up space-y-6">
      <h2 className="font-display text-3xl text-amber-200 md:text-4xl">{title}</h2>

      {podium.length > 0 && (
        <div className="flex items-end justify-center gap-3 md:gap-6">
          {[podium[1], podium[0], podium[2]].filter(Boolean).map((p, visualIdx) => {
            if (!p) return null;
            const rank = state.leaderboard.findIndex((x) => x.id === p.id) + 1;
            const heights = ["h-28", "h-40", "h-24"];
            const delays = ["delay-100", "delay-0", "delay-200"];
            return (
              <div
                key={p.id}
                className={`flex w-24 flex-col items-center md:w-32 ${delays[visualIdx]} animate-fade-up`}
              >
                <AvatarBadge avatar={p.avatar} size="lg" className="animate-bounce-soft mb-2" />
                <p className="truncate text-center text-sm font-medium">{p.name}</p>
                <p className="mb-2 font-display text-amber-200 tabular-nums">{p.score}</p>
                <div
                  className={`flex w-full items-start justify-center rounded-t-2xl bg-gradient-to-t from-amber-500/40 to-amber-300/20 pt-3 ring-1 ring-amber-300/30 ${heights[visualIdx]}`}
                >
                  <span className="font-display text-2xl text-amber-100">{rank}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-3 rounded-3xl bg-black/30 p-4 ring-1 ring-white/10 md:p-6">
        {state.leaderboard.map((p, i) => {
          const pct = ready ? (p.score / max) * 100 : 0;
          const isMe = p.id === highlightId;
          return (
            <div
              key={p.id}
              className={`animate-fade-up ${isMe ? "rounded-xl bg-amber-400/10 p-2 ring-1 ring-amber-300/30" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0 font-display text-amber-300/80">{i + 1}</span>
                  <span className="text-lg">{avatarEmoji(p.avatar)}</span>
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-amber-100">{p.score}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-400 transition-[width] duration-1000 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {!state.leaderboard.length && (
          <p className="text-sm text-white/50">尚無成績</p>
        )}
        {rest.length === 0 && podium.length === 0 && null}
      </div>
    </div>
  );
}
