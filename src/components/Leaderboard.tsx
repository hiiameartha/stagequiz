"use client";

import { AvatarBadge } from "@/components/Avatar";
import { Chip, Inset, Panel } from "@/components/ui";
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
    <Panel className="animate-fade-up" padding="sm">
      <h3 className="mb-3 font-display text-lg text-ink">{title}</h3>
      <ol className="space-y-2">
        {state.leaderboard.map((p, i) => (
          <li key={p.id} style={{ animationDelay: `${i * 40}ms` }}>
            {p.id === highlightId ? (
              <Inset className="animate-fade-up flex items-center justify-between px-3 py-2">
                <LeaderRow rank={i + 1} avatar={p.avatar} name={p.name} score={p.score} />
              </Inset>
            ) : (
              <Chip className="animate-fade-up flex items-center justify-between px-3 py-2">
                <LeaderRow rank={i + 1} avatar={p.avatar} name={p.name} score={p.score} />
              </Chip>
            )}
          </li>
        ))}
        {!state.leaderboard.length && (
          <li className="text-sm text-muted">尚無挑戰者</li>
        )}
      </ol>
    </Panel>
  );
}

function LeaderRow({
  rank,
  avatar,
  name,
  score,
}: {
  rank: number;
  avatar: Parameters<typeof AvatarBadge>[0]["avatar"];
  name: string;
  score: number;
}) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className="w-6 text-center font-display text-ink">{rank}</span>
        <AvatarBadge avatar={avatar} size="sm" />
        <span className="truncate">{name}</span>
      </span>
      <span className="tabular-nums text-muted">{score}</span>
    </>
  );
}

export function RevealBoard({ state }: { state: RoomState }) {
  const q = state.currentQuestion;
  if (!q || !state.reveal) return null;

  return (
    <div className="animate-fade-up space-y-4">
      <div className="animate-pop rounded-2xl bg-gradient-to-br from-[#2f9e5f] to-[#1f7a47] p-4 text-white shadow-[6px_6px_14px_rgba(51,50,55,0.18)]">
        <p className="text-sm text-white/85">正解</p>
        <p className="mt-1 font-display text-2xl">
          {OPTION_LABELS[q.correctIndex ?? 0]} · {q.options[q.correctIndex ?? 0]}
        </p>
      </div>
      <Panel className="overflow-hidden" padding="none">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
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
                className="animate-fade-up border-t border-[rgba(51,50,55,0.08)]"
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
                <td className="px-3 py-2 tabular-nums font-semibold text-ink">
                  +{r.pointsEarned}
                </td>
                <td className="px-3 py-2 tabular-nums">{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
