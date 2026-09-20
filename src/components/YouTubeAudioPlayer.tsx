"use client";

import { useEffect, useRef, useState } from "react";
import { EqualizerPlayControls } from "@/components/EqualizerPlayControls";
import { parseYouTubeUrl } from "@/lib/quiz/youtube";

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement | string,
    opts: {
      height?: string | number;
      width?: string | number;
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onError?: () => void;
        onStateChange?: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector("script[data-yt-api]")) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.dataset.ytApi = "1";
      document.head.appendChild(tag);
    }
  });
  return apiPromise;
}

type Props = {
  url: string;
  onPlayStart?: () => void;
};

/** 猜歌用：隱藏 YouTube 畫面，只留等化器播放控制（避免片名／畫面透題） */
export function YouTubeAudioPlayer({ url, onPlayStart }: Props) {
  const parsed = parseYouTubeUrl(url);
  const slotRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!parsed || !slotRef.current) return;
    let cancelled = false;
    const slot = slotRef.current;
    const mount = document.createElement("div");
    slot.appendChild(mount);

    setReady(false);
    setPlaying(false);
    setError("");

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(mount, {
        height: 1,
        width: 1,
        videoId: parsed.id,
        playerVars: {
          start: parsed.startSec,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (!cancelled) setReady(true);
          },
          onError: () => {
            if (!cancelled) {
              setError("無法載入此 YouTube（可能禁止嵌入）");
            }
          },
          onStateChange: (e) => {
            // 1 = playing, 2 = paused, 0 = ended
            if (cancelled) return;
            if (e.data === 1) setPlaying(true);
            if (e.data === 2 || e.data === 0) setPlaying(false);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      slot.innerHTML = "";
    };
  }, [parsed?.id, parsed?.startSec, url]);

  if (!parsed) {
    return <p className="text-sm text-rose-200">無法解析 YouTube 網址</p>;
  }

  function play() {
    const p = playerRef.current;
    if (!p || !parsed) return;
    p.seekTo(parsed.startSec, true);
    p.playVideo();
    onPlayStart?.();
  }

  function pause() {
    playerRef.current?.pauseVideo();
  }

  return (
    <div className="relative">
      <div
        ref={slotRef}
        className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
        aria-hidden
      />
      <EqualizerPlayControls
        playing={playing}
        ready={ready}
        error={error || undefined}
        onToggle={playing ? pause : play}
      />
    </div>
  );
}
