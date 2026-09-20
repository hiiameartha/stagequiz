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
      <div className="neu-chip inline-flex min-w-[4.5rem] items-center justify-center px-4 py-2 font-display text-lg text-muted">
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
          ? "bg-gradient-to-br from-[#e85a5a] to-[#a33232] text-white shadow-[inset_3px_3px_8px_rgba(51,50,55,0.35),inset_-2px_-2px_6px_rgba(254,254,254,0.2)]"
          : "neu-chip text-ink"
      }`}
      aria-live="polite"
    >
      {sec}s
    </div>
  );
}
