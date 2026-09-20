"use client";

import { AVATARS, type AvatarId } from "@/lib/quiz/types";

export function AvatarBadge({
  avatar,
  size = "md",
  className = "",
}: {
  avatar: AvatarId;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const emoji = AVATARS.find((a) => a.id === avatar)?.emoji ?? "🦊";
  const sizeClass =
    size === "sm"
      ? "h-8 w-8 text-lg"
      : size === "lg"
        ? "h-14 w-14 text-3xl"
        : size === "xl"
          ? "h-20 w-20 text-5xl"
          : "h-10 w-10 text-2xl";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-amber-400/15 ring-1 ring-amber-300/30 ${sizeClass} ${className}`}
      aria-hidden
    >
      {emoji}
    </span>
  );
}

export function AvatarPicker({
  value,
  onChange,
  taken = [],
}: {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  taken?: AvatarId[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-white/50">選擇動物頭像</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {AVATARS.map((a, i) => {
          const isTaken = taken.includes(a.id) && a.id !== value;
          const selected = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              disabled={isTaken}
              title={isTaken ? `${a.label}已被選走` : a.label}
              onClick={() => onChange(a.id)}
              style={{ animationDelay: `${i * 30}ms` }}
              className={`animate-pop flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-2xl transition disabled:cursor-not-allowed disabled:opacity-25 ${
                selected
                  ? "bg-amber-400/25 ring-2 ring-amber-300 scale-105"
                  : "bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
              }`}
            >
              <span>{a.emoji}</span>
              <span className="text-[10px] text-white/50">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
