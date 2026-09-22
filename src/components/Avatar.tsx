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
      className={`neu-avatar inline-flex items-center justify-center rounded-full ${sizeClass} ${className}`}
      aria-hidden
    >
      {emoji}
    </span>
  );
}

export function AvatarPicker({
  value,
  onChange,
}: {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">選擇動物頭像</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {AVATARS.map((a, i) => {
          const selected = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              title={a.label}
              onClick={() => onChange(a.id)}
              style={{ animationDelay: `${i * 30}ms` }}
              className={`animate-pop flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-2xl transition ${
                selected
                  ? "neu-option is-selected scale-105"
                  : "neu-option"
              }`}
            >
              <span>{a.emoji}</span>
              <span className="text-[10px] text-faint">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
