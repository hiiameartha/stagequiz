"use client";

import { useEffect, useState } from "react";
import { youtubeEmbedSrc } from "@/lib/quiz/youtube";
import type { Media } from "@/lib/quiz/types";

type Props = {
  media?: Media | null;
  /** 進入公布答案時為 true */
  active: boolean;
  /** 繼續下一題／看最終名次 */
  onContinue?: () => void;
  continueLabel?: string;
};

/** 限時結束／公布答案時，以 popup 嵌入正解 YouTube 影片 */
export function AnswerMediaPopup({
  media,
  active,
  onContinue,
  continueLabel = "下一題",
}: Props) {
  const embed = media?.url ? youtubeEmbedSrc(media.url, { autoplay: true }) : null;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (active && embed) setOpen(true);
    else setOpen(false);
  }, [active, embed, media?.url]);

  if (!active || !embed) return null;

  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-2xl bg-white/15 px-4 py-3 text-sm ring-1 ring-white/20 hover:bg-white/20"
        >
          正解影片
        </button>
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="rounded-2xl bg-amber-400 px-4 py-3 font-display text-ink shadow-lg hover:bg-amber-300"
          >
            {continueLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-label="正解影片"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="關閉"
        onClick={() => setOpen(false)}
      />
      <div className="animate-fade-up relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl bg-ink ring-1 ring-amber-300/40">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="font-display text-lg text-amber-100">正解影片</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
            >
              關閉
            </button>
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="rounded-xl bg-amber-400 px-4 py-1.5 font-display text-ink hover:bg-amber-300"
              >
                {continueLabel}
              </button>
            )}
          </div>
        </div>
        <div className="aspect-video w-full bg-black">
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
    </div>
  );
}
