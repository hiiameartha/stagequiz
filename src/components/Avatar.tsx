"use client";

import dynamic from "next/dynamic";
import {
  DEFAULT_AVATAR,
  avatarEmoji,
  type AvatarId,
} from "@/lib/quiz/types";

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <p className="rounded-2xl bg-[var(--surface-muted)] px-4 py-8 text-center text-sm text-muted">
        載入表情符號…
      </p>
    ),
  }
);

export function AvatarBadge({
  avatar,
  size = "md",
  className = "",
}: {
  avatar: AvatarId;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const emoji = avatarEmoji(avatar);
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
  const selectedEmoji = avatarEmoji(value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">選擇頭像</p>
        <span className="neu-avatar inline-flex h-10 w-10 items-center justify-center rounded-full text-2xl">
          {selectedEmoji}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl ring-1 ring-[rgba(51,50,55,0.08)]">
        <EmojiPicker
          onEmojiClick={(emojiData) => {
            onChange(emojiData.emoji || DEFAULT_AVATAR);
          }}
          width="100%"
          height={360}
          previewConfig={{ showPreview: false }}
          skinTonesDisabled
          searchPlaceHolder="搜尋表情…"
          lazyLoadEmojis
        />
      </div>
    </div>
  );
}
