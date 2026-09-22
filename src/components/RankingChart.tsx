"use client";

import { useEffect, useState } from "react";
import { AvatarBadge } from "@/components/Avatar";
import { Inset, Panel } from "@/components/ui";
import { avatarEmoji, type RoomState } from "@/lib/quiz/types";

export function RankingChart({
  state,
  highlightId,
  title = "最終名次",
  /** 只顯示頒獎台（冠亞季），不顯示下方長條圖 */
  podiumOnly = false,
  /** 放大頒獎台（投影／popup） */
  large = false,
}: {
  state: RoomState;
  highlightId?: string;
  title?: string;
  podiumOnly?: boolean;
  large?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const max = Math.max(1, ...state.leaderboard.map((p) => p.score));

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [state.leaderboard]);

  const podium = state.leaderboard.slice(0, 3);
  const rest = state.leaderboard.slice(3);
  const heights = large
    ? ["h-36 md:h-48", "h-52 md:h-64", "h-32 md:h-40"]
    : ["h-28", "h-40", "h-24"];
  const colWidth = large
    ? "w-28 md:w-40"
    : "w-24 md:w-32";

  return (
    <div className="animate-fade-up space-y-6">
      {title ? (
        <h2 className="font-display text-3xl text-ink md:text-4xl">{title}</h2>
      ) : null}

      {podium.length > 0 && (
        <div className={`flex items-end justify-center ${large ? "gap-4 md:gap-10" : "gap-3 md:gap-6"}`}>
          {[podium[1], podium[0], podium[2]].filter(Boolean).map((p, visualIdx) => {
            if (!p) return null;
            const rank = state.leaderboard.findIndex((x) => x.id === p.id) + 1;
            const medal =
              rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : String(rank);
            const delays = ["delay-100", "delay-0", "delay-200"];
            return (
              <div
                key={p.id}
                className={`flex flex-col items-center ${colWidth} ${delays[visualIdx]} animate-fade-up`}
              >
                <AvatarBadge
                  avatar={p.avatar}
                  size={large ? "xl" : "lg"}
                  className="animate-bounce-soft mb-2"
                />
                <p
                  className={`truncate text-center font-medium ${
                    large ? "text-base md:text-lg" : "text-sm"
                  }`}
                >
                  {p.name}
                </p>
                <p
                  className={`mb-2 font-display tabular-nums text-ink ${
                    large ? "text-2xl md:text-3xl" : ""
                  }`}
                >
                  {p.score}
                </p>
                <Panel
                  className={`flex w-full items-start justify-center rounded-t-2xl border-t-4 border-[var(--orange)] bg-gradient-to-t from-[#f0efed] to-[#fefefe] pt-3 ${heights[visualIdx]}`}
                  padding="none"
                >
                  <span
                    className={large ? "text-4xl md:text-5xl" : "text-3xl"}
                    aria-label={`第 ${rank} 名`}
                  >
                    {medal}
                  </span>
                </Panel>
              </div>
            );
          })}
        </div>
      )}

      {!podiumOnly && (
        <Panel className="space-y-3" padding="md">
          {state.leaderboard.map((p, i) => {
            const pct = ready ? (p.score / max) * 100 : 0;
            const isMe = p.id === highlightId;
            const row = (
              <>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 font-display text-ink">{i + 1}</span>
                    <span className="text-lg">{avatarEmoji(p.avatar)}</span>
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-ink">
                    {p.score}
                  </span>
                </div>
                <Inset className="h-3 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#333237] to-[#fe811f] transition-[width] duration-1000 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </Inset>
              </>
            );
            return (
              <div
                key={p.id}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {isMe ? <Inset className="rounded-xl p-2">{row}</Inset> : row}
              </div>
            );
          })}
          {!state.leaderboard.length && (
            <p className="text-sm text-muted">尚無成績</p>
          )}
          {rest.length === 0 && podium.length === 0 && null}
        </Panel>
      )}

      {podiumOnly && rest.length > 0 && (
        <ul className={`space-y-2 ${large ? "mt-2 text-base md:text-lg" : ""}`}>
          {rest.map((p, i) => (
            <li
              key={p.id}
              className="animate-fade-up flex items-center justify-between gap-2 text-sm"
              style={{ animationDelay: `${(i + 3) * 50}ms` }}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-5 shrink-0 font-display text-ink">{i + 4}</span>
                <span className="text-lg" aria-hidden>
                  {avatarEmoji(p.avatar)}
                </span>
                <span className="truncate">{p.name}</span>
              </span>
              <span className="shrink-0 tabular-nums font-semibold text-ink">
                {p.score}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
