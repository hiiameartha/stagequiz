"use client";

import { useMemo, useState } from "react";
import { QuestionMedia } from "@/components/QuestionMedia";
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
  const [mediaDraft, setMediaDraft] = useState<Record<string, { type: MediaType; url: string }>>(
    {}
  );

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
        <h2 className="font-display text-xl text-amber-200">題庫</h2>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...list, emptyQuestion()])}
          className="rounded-xl bg-amber-400/20 px-3 py-1.5 text-sm text-amber-100 ring-1 ring-amber-300/30 hover:bg-amber-400/30 disabled:opacity-40"
        >
          新增題目
        </button>
      </div>

      {list.map((q, qi) => {
        const draft = mediaDraft[q.id] ?? {
          type: q.media?.type ?? "image",
          url: q.media?.url ?? "",
        };
        return (
          <article
            key={q.id}
            className="space-y-3 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-amber-300/80">第 {qi + 1} 題</p>
              <button
                type="button"
                disabled={disabled || list.length <= 1}
                onClick={() => onChange(list.filter((_, i) => i !== qi))}
                className="text-sm text-rose-300/80 hover:text-rose-200 disabled:opacity-30"
              >
                刪除
              </button>
            </div>

            <textarea
              disabled={disabled}
              value={q.text}
              onChange={(e) => update(qi, { text: e.target.value })}
              placeholder="題目文字"
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-amber-300/40"
            />

            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, oi) => (
                <label key={oi} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correctIndex === oi}
                    disabled={disabled}
                    onChange={() =>
                      update(qi, { correctIndex: oi as 0 | 1 | 2 | 3 })
                    }
                  />
                  <input
                    disabled={disabled}
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    placeholder={`選項 ${String.fromCharCode(65 + oi)}`}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 outline-none focus:border-amber-300/40"
                  />
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2">
                <span className="text-white/50">時限(秒)</span>
                <input
                  type="number"
                  min={5}
                  max={120}
                  disabled={disabled}
                  value={q.timeLimitSec}
                  onChange={(e) =>
                    update(qi, { timeLimitSec: Number(e.target.value) || 20 })
                  }
                  className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="text-white/50">基礎分</span>
                <input
                  type="number"
                  min={100}
                  step={100}
                  disabled={disabled}
                  value={q.points}
                  onChange={(e) =>
                    update(qi, { points: Number(e.target.value) || 1000 })
                  }
                  className="w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-1"
                />
              </label>
            </div>

            <div className="space-y-2 rounded-xl bg-white/5 p-3">
              <p className="text-xs text-white/50">
                媒體（選填）— 圖片、音訊檔，或 YouTube（猜歌：只播聲音、不顯示畫面）
              </p>
              <div className="flex flex-wrap gap-2">
                <select
                  disabled={disabled}
                  value={draft.type}
                  onChange={(e) =>
                    setMediaDraft((m) => ({
                      ...m,
                      [q.id]: { ...draft, type: e.target.value as MediaType },
                    }))
                  }
                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
                >
                  <option value="image">圖片</option>
                  <option value="audio">音訊／歌曲</option>
                </select>
                <input
                  disabled={disabled}
                  value={draft.url}
                  onChange={(e) =>
                    setMediaDraft((m) => ({
                      ...m,
                      [q.id]: { ...draft, url: e.target.value },
                    }))
                  }
                  placeholder="https://..."
                  className="min-w-[12rem] flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={disabled}
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
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                >
                  套用
                </button>
                {q.media && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      update(qi, { media: undefined });
                      setMediaDraft((m) => ({
                        ...m,
                        [q.id]: { type: "image", url: "" },
                      }));
                    }}
                    className="rounded-lg px-2 py-1.5 text-sm text-rose-300"
                  >
                    清除
                  </button>
                )}
              </div>
              {q.media && (
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <p className="text-xs text-amber-200/80">
                    預覽（確認能否正常顯示／播放）
                  </p>
                  <QuestionMedia key={q.media.url} media={q.media} playAudio />
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
