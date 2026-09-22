"use client";

import { useEffect, useRef, useState } from "react";
import { EqualizerPlayControls } from "@/components/EqualizerPlayControls";
import { YouTubeAudioPlayer } from "@/components/YouTubeAudioPlayer";
import { Alert, Inset, Panel } from "@/components/ui";
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

function ListeningHint() {
  return (
    <Inset className="animate-pulse-soft flex items-center gap-3 px-4 py-3">
      <span className="text-2xl" aria-hidden>
        🎵
      </span>
      <div>
        <p className="font-display text-ink">請聽大螢幕播放的音樂</p>
        <p className="text-sm text-muted">音訊由 Host 投影播放</p>
      </div>
    </Inset>
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
    if (!playAudio) return <ListeningHint />;
    return <YouTubeAudioPlayer url={media.url} onPlayStart={onPlayStart} />;
  }

  if (media.type === "image") {
    if (!media.url) return null;
    if (imgError) {
      return (
        <Alert tone="error">
          圖片無法載入，請檢查網址是否正確、是否允許外部引用。
        </Alert>
      );
    }
    return (
      <Panel className="animate-fade-up overflow-hidden" padding="none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={media.url}
          src={media.url}
          alt="題目圖片"
          className={`mx-auto block h-auto w-auto max-w-full object-contain ${
            large ? "max-h-[min(56vh,720px)]" : "max-h-56"
          }`}
          onError={() => setImgError(true)}
          onLoad={() => setImgError(false)}
        />
      </Panel>
    );
  }

  if (media.type !== "audio") return null;

  if (!playAudio || !media.url) return <ListeningHint />;

  return <FileAudioPlayer url={media.url} onPlayStart={onPlayStart} />;
}
