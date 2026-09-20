"use client";

import { useEffect, useRef, useState } from "react";
import { EqualizerPlayControls } from "@/components/EqualizerPlayControls";
import { YouTubeAudioPlayer } from "@/components/YouTubeAudioPlayer";
import { youtubeEmbedSrc } from "@/lib/quiz/youtube";
import type { Media } from "@/lib/quiz/types";

type Props = {
  media?: Media;
  large?: boolean;
  /** Audio / YouTube only plays on host / projector display. */
  playAudio?: boolean;
  /** 音樂開始播放時（用來啟動倒數） */
  onPlayStart?: () => void;
};

function FileAudioPlayer({
  url,
  onPlayStart,
}: {
  url: string;
  onPlayStart?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReady(false);
    setPlaying(false);
    setError("");
  }, [url]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().then(() => onPlayStart?.());
    } else {
      audio.pause();
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        key={url}
        src={url}
        preload="metadata"
        className="hidden"
        onCanPlay={() => setReady(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setError("無法載入此音訊")}
      />
      <EqualizerPlayControls
        playing={playing}
        ready={ready}
        error={error || undefined}
        onToggle={toggle}
      />
    </>
  );
}

export function QuestionMedia({
  media,
  large,
  playAudio = false,
  onPlayStart,
}: Props) {
  const [imgError, setImgError] = useState(false);

  if (!media) return null;

  const isYouTube = Boolean(media.url && youtubeEmbedSrc(media.url));

  if (isYouTube && media.url) {
    if (!playAudio) {
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
    return <YouTubeAudioPlayer url={media.url} onPlayStart={onPlayStart} />;
  }

  if (media.type === "image") {
    if (!media.url) return null;
    if (imgError) {
      return (
        <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-400/30">
          圖片無法載入，請檢查網址是否正確、是否允許外部引用。
        </div>
      );
    }
    return (
      <div
        className={`animate-fade-up overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10 ${
          large ? "max-h-[42vh]" : "max-h-56"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={media.url}
          src={media.url}
          alt="題目圖片"
          className="mx-auto max-h-full w-full object-contain"
          onError={() => setImgError(true)}
          onLoad={() => setImgError(false)}
        />
      </div>
    );
  }

  if (media.type !== "audio") return null;

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

  return <FileAudioPlayer url={media.url} onPlayStart={onPlayStart} />;
}
