"use client";

import { useEffect, useRef } from "react";

const BAR_COUNT = 28;
const IDLE_SCALE = 0.12;
const MIN_SCALE = 0.15;
const MAX_SCALE = 1;
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => i);

type Props = {
  playing: boolean;
  ready?: boolean;
  disabled?: boolean;
  error?: string;
  onToggle: () => void;
  /** 無障礙：播放／暫停按鈕標籤 */
  labelPlaying?: string;
  labelPaused?: string;
  labelLoading?: string;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Equalizer + play/pause：播放時隨機高低跳動（無歌名，適合猜歌） */
export function EqualizerPlayControls({
  playing,
  ready = true,
  disabled = false,
  error,
  onToggle,
  labelPlaying = "暫停",
  labelPaused = "播放聲音",
  labelLoading = "載入中…",
}: Props) {
  const isDisabled = disabled || !ready;
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const valuesRef = useRef(Array.from({ length: BAR_COUNT }, () => IDLE_SCALE));
  const targetsRef = useRef(Array.from({ length: BAR_COUNT }, () => IDLE_SCALE));
  const nextKickRef = useRef(Array.from({ length: BAR_COUNT }, () => 0));

  useEffect(() => {
    const bars = barsRef.current;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const paint = (scale: number) => {
      for (let i = 0; i < BAR_COUNT; i++) {
        valuesRef.current[i] = scale;
        targetsRef.current[i] = scale;
        bars[i]?.style.setProperty("transform", `scaleY(${scale})`);
      }
    };

    if (!playing) {
      paint(IDLE_SCALE);
      return;
    }

    if (reduceMotion) {
      paint(0.55);
      return;
    }

    const start = performance.now();
    for (let i = 0; i < BAR_COUNT; i++) {
      targetsRef.current[i] = rand(MIN_SCALE, MAX_SCALE);
      nextKickRef.current[i] = start + rand(0, 160);
    }

    let raf = 0;
    const tick = (now: number) => {
      for (let i = 0; i < BAR_COUNT; i++) {
        if (now >= nextKickRef.current[i]) {
          const spike = Math.random() < 0.22;
          targetsRef.current[i] = spike
            ? rand(0.65, MAX_SCALE)
            : rand(MIN_SCALE, 0.55);
          nextKickRef.current[i] = now + rand(40, 220);
        }
        const cur = valuesRef.current[i];
        const target = targetsRef.current[i];
        const ease = rand(0.12, 0.38);
        const next = cur + (target - cur) * ease;
        valuesRef.current[i] = next;
        bars[i]?.style.setProperty("transform", `scaleY(${next})`);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  if (error) {
    return (
      <div className="animate-fade-up rounded-2xl bg-black/30 p-5 ring-1 ring-white/10">
        <p className="text-sm text-rose-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="eq-player animate-fade-up">
      <div className="eq-wave" aria-hidden data-playing={playing ? "true" : "false"}>
        {BARS.map((i) => (
          <span
            key={i}
            className="eq-wave-bar"
            ref={(el) => {
              barsRef.current[i] = el;
            }}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={isDisabled}
        onClick={onToggle}
        aria-label={!ready ? labelLoading : playing ? labelPlaying : labelPaused}
        className="eq-play-btn"
      >
        {!ready ? (
          <span className="eq-play-btn__text">{labelLoading}</span>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            {playing ? (
              <path
                d="M8.4 5.6h3.1v12.8H8.4zM12.9 5.6H16v12.8h-3.1z"
                fill="currentColor"
              />
            ) : (
              <path d="M8.8 5.6v12.8L18.6 12z" fill="currentColor" />
            )}
          </svg>
        )}
      </button>
    </div>
  );
}
