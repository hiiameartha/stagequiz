"use client";

import { useMemo, useState } from "react";
import { QuestionMedia } from "@/components/QuestionMedia";
import {
  Button,
  FieldInput,
  FieldSelect,
  FieldTextarea,
  Inset,
  Panel,
} from "@/components/ui";
import { OPTION_LABELS } from "@/lib/quiz/types";
import { parseYouTubeUrl } from "@/lib/quiz/youtube";
import type { MediaType, Question } from "@/lib/quiz/types";

function emptyQuestion(): Question {
  return {
    id: crypto.randomUUID(),
    text: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    timeLimitSec: 20,
    points: 1000,
  };
}

type Props = {
  questions: Question[];
  onChange: (questions: Question[]) => void;
  disabled?: boolean;
};

export function QuestionEditor({ questions, onChange, disabled }: Props) {
  const [mediaDraft, setMediaDraft] = useState<
    Record<string, { type: MediaType; url: string }>
  >({});

  const list = useMemo(() => questions, [questions]);

  function update(index: number, patch: Partial<Question>) {
    const next = list.map((q, i) => (i === index ? { ...q, ...patch } : q));
    onChange(next);
  }

  function updateOption(qi: number, oi: number, value: string) {
    const q = list[qi]!;
    const options = [...q.options] as [string, string, string, string];
    options[oi] = value;
    update(qi, { options });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl text-ink">題庫</h2>
        <Button
          disabled={disabled}
          onClick={() => onChange([...list, emptyQuestion()])}
          variant="accent"
          size="sm"
        >
          新增題目
        </Button>
      </div>

      {list.map((q, qi) => {
        const draft = mediaDraft[q.id] ?? {
          type: q.media?.type ?? "image",
          url: q.media?.url ?? "",
        };
        return (
          <Panel key={q.id} as="article" padding="md" className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-lg text-ink">第 {qi + 1} 題</p>
              <Button
                disabled={disabled || list.length <= 1}
                onClick={() => onChange(list.filter((_, i) => i !== qi))}
                variant="ghost"
                size="sm"
                className="shrink-0 text-[#a33232]"
              >
                刪除
              </Button>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold tracking-wide text-muted">
                題目
              </p>
              <FieldTextarea
                disabled={disabled}
                value={q.text}
                onChange={(e) => update(qi, { text: e.target.value })}
                placeholder="請輸入題目內容"
                rows={2}
                className="resize-y leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-muted">
                選項（點選左側圓點設為正解）
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[rgba(51,50,55,0.06)] bg-[var(--surface-muted)]/60 px-2.5 py-2"
                  >
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correctIndex === oi}
                      disabled={disabled}
                      onChange={() =>
                        update(qi, { correctIndex: oi as 0 | 1 | 2 | 3 })
                      }
                      className="h-4 w-4 shrink-0 accent-[var(--orange)]"
                    />
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--ink)] font-display text-xs text-white">
                      {OPTION_LABELS[oi]}
                    </span>
                    <FieldInput
                      disabled={disabled}
                      value={opt}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                      placeholder={`選項 ${OPTION_LABELS[oi]}`}
                      className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 shadow-none focus:bg-[var(--white)] focus:shadow-[var(--ring-orange)]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
              <label className="block space-y-1.5">
                <span className="block whitespace-nowrap text-xs font-semibold text-muted">
                  時限（秒）
                </span>
                <FieldInput
                  type="number"
                  min={5}
                  max={120}
                  disabled={disabled}
                  value={q.timeLimitSec}
                  onChange={(e) =>
                    update(qi, { timeLimitSec: Number(e.target.value) || 20 })
                  }
                  className="tabular-nums"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="block whitespace-nowrap text-xs font-semibold text-muted">
                  基礎分
                </span>
                <FieldInput
                  type="number"
                  min={100}
                  step={100}
                  disabled={disabled}
                  value={q.points}
                  onChange={(e) =>
                    update(qi, { points: Number(e.target.value) || 1000 })
                  }
                  className="tabular-nums"
                />
              </label>
            </div>

            <Inset className="space-y-3 p-4">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-muted">媒體（選填）</p>
                <p className="text-xs text-faint">
                  圖片、音訊檔，或 YouTube（猜歌只播聲音）
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center">
                <FieldSelect
                  disabled={disabled}
                  value={draft.type}
                  onChange={(e) =>
                    setMediaDraft((m) => ({
                      ...m,
                      [q.id]: { ...draft, type: e.target.value as MediaType },
                    }))
                  }
                  className="neu-input-auto w-full"
                >
                  <option value="image">圖片</option>
                  <option value="audio">音訊／歌曲</option>
                </FieldSelect>
                <div className="flex min-w-0 items-center gap-2">
                  <FieldInput
                    disabled={disabled}
                    value={draft.url}
                    onChange={(e) =>
                      setMediaDraft((m) => ({
                        ...m,
                        [q.id]: { ...draft, url: e.target.value },
                      }))
                    }
                    placeholder="https://..."
                    className="min-w-0 flex-1 truncate"
                  />
                  <Button
                    disabled={disabled}
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      const url = draft.url.trim();
                      if (!url) {
                        update(qi, { media: undefined });
                        return;
                      }
                      const isYt = Boolean(parseYouTubeUrl(url));
                      const type: MediaType = isYt ? "audio" : draft.type;
                      if (isYt && draft.type !== "audio") {
                        setMediaDraft((m) => ({
                          ...m,
                          [q.id]: { type: "audio", url },
                        }));
                      }
                      update(qi, { media: { type, url } });
                    }}
                  >
                    套用
                  </Button>
                  {q.media && (
                    <Button
                      disabled={disabled}
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-[#a33232]"
                      onClick={() => {
                        update(qi, { media: undefined });
                        setMediaDraft((m) => ({
                          ...m,
                          [q.id]: { type: "image", url: "" },
                        }));
                      }}
                    >
                      清除
                    </Button>
                  )}
                </div>
              </div>

              {q.media && (
                <div className="space-y-2 border-t border-[rgba(51,50,55,0.08)] pt-3">
                  <p className="text-xs font-semibold text-muted">預覽</p>
                  <div className="eq-preview">
                    <QuestionMedia
                      key={q.media.url}
                      media={q.media}
                      playAudio
                    />
                  </div>
                </div>
              )}
            </Inset>
          </Panel>
        );
      })}
    </div>
  );
}
