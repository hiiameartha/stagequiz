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
        let stateClass = "neu-option";
        if (reveal && correctIndex === i) {
          stateClass = "neu-option is-correct";
        } else if (reveal && selected === i && correctIndex !== i) {
          stateClass = "neu-option is-wrong";
        } else if (!reveal && selected === i) {
          stateClass = "neu-option is-selected";
        }

        return (
          <button
            key={i}
            type="button"
            disabled={disabled || reveal}
            onClick={() => onSelect?.(i)}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`animate-fade-up flex items-start gap-3 rounded-2xl px-4 py-3 text-left ${stateClass} ${
              large ? "min-h-[4.5rem] text-lg" : "text-base"
            } disabled:cursor-default`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ink)] font-display text-sm text-white">
              {OPTION_LABELS[i]}
            </span>
            <span className="pt-1 leading-snug">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
