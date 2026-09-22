"use client";

import { useState } from "react";
import { RankingChart } from "@/components/RankingChart";
import type { Media, RoomState } from "@/lib/quiz/types";
import { youtubeEmbedSrc } from "@/lib/quiz/youtube";

type Props = {
  state: RoomState;
  media?: Media | null;
  /** 繼續下一題／看最終名次（公布答案後） */
  onContinue?: () => void;
  continueLabel?: string;
};

/** 有人交卷後顯示即時頒獎台；全員答完後右側出現正解影片 */
export function AnswerMediaPopup({
  state,
  media,
  onContinue,
  continueLabel = "下一題",
}: Props) {
  const answering = state.phase === "answering";
  const reveal = state.phase === "reveal";
  const active = (answering && state.answeredCount > 0) || reveal;
  const embed =
    reveal && media?.url
      ? youtubeEmbedSrc(media.url, { autoplay: true })
      : null;
  const showVideo = Boolean(embed);

  // 換題／進入公布時自動打開；使用者關閉則記住本 session
  const sessionKey = active
    ? `${state.currentIndex}:${reveal ? "reveal" : "answering"}`
    : null;
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const open = sessionKey != null && dismissedKey !== sessionKey;

  if (!active || !sessionKey) return null;

  const title = reveal
    ? showVideo
      ? "目前排名＆正解"
      : "目前排名"
    : `目前排名 · ${state.answeredCount}/${state.playerCount} 已交卷`;

  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setDismissedKey(null)}
          className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm text-white shadow-lg ring-1 ring-[rgba(254,129,31,0.45)] hover:bg-[#2a292e]"
        >
          {reveal && showVideo ? "排名＆正解" : "目前排名"}
        </button>
        {reveal && onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="rounded-2xl bg-[var(--orange)] px-4 py-3 font-display text-ink shadow-lg hover:bg-[var(--orange-light)]"
          >
            {continueLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(51,50,55,0.72)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="關閉"
        onClick={() => setDismissedKey(sessionKey)}
      />
      <div
        className={`animate-fade-up relative z-10 flex max-h-[94vh] min-h-[min(70vh,720px)] w-full flex-col overflow-hidden rounded-3xl bg-[var(--surface)] shadow-[var(--neu-raised-lg)] ring-1 ring-[rgba(51,50,55,0.08)] ${
          showVideo ? "max-w-7xl" : "max-w-5xl"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(51,50,55,0.08)] px-6 py-4">
          <p className="font-display text-xl text-ink md:text-2xl">{title}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDismissedKey(sessionKey)}
              className="rounded-xl bg-[var(--surface-muted)] px-4 py-2 text-sm text-ink hover:brightness-95"
            >
              關閉
            </button>
            {reveal && onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="rounded-xl bg-[var(--orange)] px-5 py-2 font-display text-ink hover:bg-[var(--orange-light)]"
              >
                {continueLabel}
              </button>
            )}
          </div>
        </div>

        <div
          className={`grid min-h-0 flex-1 overflow-auto ${
            showVideo ? "md:grid-cols-2" : "grid-cols-1"
          }`}
        >
          <div className="flex min-h-0 flex-col justify-center overflow-auto p-6 md:p-10">
            <RankingChart
              key={`${state.currentIndex}-${
                state.answeredCount
              }-${state.leaderboard
                .map((p) => `${p.id}:${p.score}`)
                .join(",")}`}
              state={state}
              title=""
              podiumOnly
              large
            />
            {answering && (
              <p className="mt-8 text-center text-base text-muted md:text-lg">
                還有 {Math.max(0, state.playerCount - state.answeredCount)}{" "}
                人尚未交卷
              </p>
            )}
          </div>

          {showVideo && embed && (
            <div className="flex min-h-0 flex-col items-center justify-center gap-3 border-t border-[rgba(51,50,55,0.08)] p-5 md:border-t-0 md:border-l md:p-8">
              <div className="aspect-video w-full max-w-xl overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/10">
                <iframe
                  key={embed}
                  src={embed}
                  title="正解影片"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
