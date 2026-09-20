"use client";

import type { Media } from "@/lib/quiz/types";

type Props = {
  media?: Media;
  large?: boolean;
  /** Audio only plays on host / projector display. */
  playAudio?: boolean;
};

export function QuestionMedia({ media, large, playAudio = false }: Props) {
  if (!media?.url && media?.type !== "audio") return null;
  if (!media) return null;

  if (media.type === "image") {
    if (!media.url) return null;
    return (
      <div
        className={`animate-fade-up overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10 ${
          large ? "max-h-[42vh]" : "max-h-56"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.url}
          alt="題目圖片"
          className="mx-auto max-h-full w-full object-contain"
        />
      </div>
    );
  }

  // Audio: host plays; clients only see a listening hint
  if (!playAudio || !media.url) {
    return (
      <div className="animate-pulse-soft flex items-center gap-3 rounded-2xl bg-violet-500/15 px-4 py-3 ring-1 ring-violet-300/30">
        <span className="text-2xl" aria-hidden>
          🎵
        </span>
        <div>
          <p className="font-display text-violet-100">請聽大螢幕播放的音樂</p>
          <p className="text-sm text-white/50">音訊由 Host 投影播放</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
      <p className="mb-2 text-sm text-white/60">歌曲／音訊（僅此畫面播放）</p>
      <audio src={media.url} controls autoPlay className="w-full" />
    </div>
  );
}
