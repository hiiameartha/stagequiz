"use client";

import { AvatarBadge } from "@/components/Avatar";
import { OPTION_LABELS, type RoomState } from "@/lib/quiz/types";

export function Leaderboard({
  state,
  highlightId,
  title = "排行榜",
}: {
  state: RoomState;
  highlightId?: string;
  title?: string;
}) {
  return (
    <div className="animate-fade-up rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
      <h3 className="mb-3 font-display text-lg text-amber-200">{title}</h3>
      <ol className="space-y-2">
        {state.leaderboard.map((p, i) => (
          <li
            key={p.id}
            style={{ animationDelay: `${i * 40}ms` }}
            className={`animate-fade-up flex items-center justify-between rounded-xl px-3 py-2 ${
              p.id === highlightId ? "bg-amber-400/15 ring-1 ring-amber-300/40" : "bg-white/5"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="w-6 text-center font-display text-amber-300/80">
                {i + 1}
              </span>
              <AvatarBadge avatar={p.avatar} size="sm" />
              <span className="truncate">{p.name}</span>
            </span>
            <span className="tabular-nums text-white/80">{p.score}</span>
          </li>
        ))}
        {!state.leaderboard.length && (
          <li className="text-sm text-white/50">尚無挑戰者</li>
        )}
      </ol>
    </div>
  );
}

export function RevealBoard({ state }: { state: RoomState }) {
  const q = state.currentQuestion;
  if (!q || !state.reveal) return null;

  return (
    <div className="animate-fade-up space-y-4">
      <div className="animate-pop rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-400/30">
        <p className="text-sm text-emerald-200/80">正解</p>
        <p className="mt-1 font-display text-2xl text-emerald-100">
          {OPTION_LABELS[q.correctIndex ?? 0]} · {q.options[q.correctIndex ?? 0]}
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl ring-1 ring-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-3 py-2 font-medium">挑戰者</th>
              <th className="px-3 py-2 font-medium">作答</th>
              <th className="px-3 py-2 font-medium">本題</th>
              <th className="px-3 py-2 font-medium">總分</th>
            </tr>
          </thead>
          <tbody>
            {state.reveal.map((r, i) => (
              <tr
                key={r.playerId}
                style={{ animationDelay: `${i * 50}ms` }}
                className="animate-fade-up border-t border-white/5"
              >
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <AvatarBadge avatar={r.avatar} size="sm" />
                    {r.name}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {r.choice === null
                    ? "—"
                    : `${OPTION_LABELS[r.choice]}${r.correct ? " ✓" : " ✗"}`}
                </td>
                <td className="px-3 py-2 tabular-nums text-amber-200">
                  +{r.pointsEarned}
                </td>
                <td className="px-3 py-2 tabular-nums">{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
