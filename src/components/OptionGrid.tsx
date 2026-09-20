"use client";

import { OPTION_LABELS } from "@/lib/quiz/types";

type Props = {
  options: string[];
  selected?: number | null;
  correctIndex?: number;
  reveal?: boolean;
  disabled?: boolean;
  onSelect?: (index: number) => void;
  large?: boolean;
};

export function OptionGrid({
  options,
  selected,
  correctIndex,
  reveal,
  disabled,
  onSelect,
  large,
}: Props) {
  return (
    <div className={`grid gap-3 ${large ? "md:grid-cols-2" : "grid-cols-1"}`}>
      {options.map((opt, i) => {
        let style =
          "border-white/15 bg-white/5 hover:bg-white/10 hover:border-amber-300/40";
        if (reveal && correctIndex === i) {
          style = "border-emerald-400/60 bg-emerald-500/20 text-emerald-100";
        } else if (reveal && selected === i && correctIndex !== i) {
          style = "border-rose-400/50 bg-rose-500/15 text-rose-100";
        } else if (!reveal && selected === i) {
          style = "border-amber-300/70 bg-amber-400/20 text-amber-50";
        }

        return (
          <button
            key={i}
            type="button"
            disabled={disabled || reveal}
            onClick={() => onSelect?.(i)}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`animate-fade-up flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${style} ${
              large ? "min-h-[4.5rem] text-lg" : "text-base"
            } disabled:cursor-default`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/30 font-display text-sm text-amber-200">
              {OPTION_LABELS[i]}
            </span>
            <span className="pt-1 leading-snug">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
