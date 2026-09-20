"use client";

import { useEffect, useState } from "react";

export function Timer({
  endsAt,
  waitingLabel,
}: {
  endsAt: number | null;
  /** 音樂題尚未播放時顯示 */
  waitingLabel?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) {
    if (!waitingLabel) return null;
    return (
      <div className="inline-flex min-w-[4.5rem] items-center justify-center rounded-xl bg-white/10 px-4 py-2 font-display text-lg text-white/60 ring-1 ring-white/15">
        {waitingLabel}
      </div>
    );
  }

  const remaining = Math.max(0, endsAt - now);
  const sec = Math.ceil(remaining / 1000);
  const urgent = sec <= 5;

  return (
    <div
      className={`inline-flex min-w-[4.5rem] items-center justify-center rounded-xl px-4 py-2 font-display text-3xl tabular-nums tracking-tight ${
        urgent
          ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/40"
          : "bg-white/10 text-amber-200 ring-1 ring-white/15"
      }`}
      aria-live="polite"
    >
      {sec}s
    </div>
  );
}
