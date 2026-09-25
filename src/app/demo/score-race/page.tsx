"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ScoreRace } from "@/components/ScoreRace";
import { AccentLabel, Button, Panel } from "@/components/ui";
import type { RevealEntry, RoomState } from "@/lib/quiz/types";

/**
 * 示範用假資料：開局 Fox 領先，本題 Cat／Panda 大追分超車，
 * Fox／Owl 被超 → 應看到「超車！」與「被超了…」。
 */
const DEMO_REVEAL: RevealEntry[] = [
  {
    playerId: "fox",
    name: "小狐（原第一）",
    avatar: "🦊",
    choice: 1,
    correct: true,
    pointsEarned: 50,
    score: 850,
  },
  {
    playerId: "owl",
    name: "貓頭鷹",
    avatar: "🦉",
    choice: 2,
    correct: true,
    pointsEarned: 10,
    score: 760,
  },
  {
    playerId: "cat",
    name: "你（大追分）",
    avatar: "🐱",
    choice: 0,
    correct: true,
    pointsEarned: 220,
    score: 920,
  },
  {
    playerId: "panda",
    name: "熊貓",
    avatar: "🐼",
    choice: 0,
    correct: true,
    pointsEarned: 230,
    score: 880,
  },
  {
    playerId: "rabbit",
    name: "兔子",
    avatar: "🐰",
    choice: null,
    correct: false,
    pointsEarned: 10,
    score: 610,
  },
];

function buildRevealState(seed: number): RoomState {
  return {
    code: "DEMO01",
    hostId: "demo-host",
    phase: "reveal",
    currentIndex: seed,
    questionEndsAt: null,
    answeredCount: DEMO_REVEAL.length,
    playerCount: DEMO_REVEAL.length,
    maxPlayers: 20,
    questionCount: 8,
    players: [],
    questions: [],
    currentQuestion: null,
    reveal: DEMO_REVEAL,
    leaderboard: DEMO_REVEAL.map((r) => ({
      id: r.playerId,
      name: r.name,
      avatar: r.avatar,
      score: r.score,
    })).sort((a, b) => b.score - a.score),
  };
}

function buildFinalState(seed: number): RoomState {
  const board = [
    { id: "cat", name: "你", avatar: "🐱", score: 920 },
    { id: "panda", name: "熊貓", avatar: "🐼", score: 880 },
    { id: "fox", name: "小狐", avatar: "🦊", score: 850 },
    { id: "owl", name: "貓頭鷹", avatar: "🦉", score: 760 },
    { id: "rabbit", name: "兔子", avatar: "🐰", score: 610 },
  ];
  return {
    code: "DEMO01",
    hostId: "demo-host",
    phase: "final",
    currentIndex: seed,
    questionEndsAt: null,
    answeredCount: board.length,
    playerCount: board.length,
    maxPlayers: 20,
    questionCount: 8,
    players: [],
    questions: [],
    currentQuestion: null,
    // 模擬真實 final：後端仍會帶上一題 reveal；衝刺應忽略它、從 0 起跑
    reveal: [
      {
        playerId: "cat",
        name: "你（冠軍）",
        avatar: "🐱",
        choice: 0,
        correct: true,
        pointsEarned: 40,
        score: 920,
      },
      {
        playerId: "panda",
        name: "熊貓",
        avatar: "🐼",
        choice: 1,
        correct: true,
        pointsEarned: 30,
        score: 880,
      },
      {
        playerId: "fox",
        name: "小狐",
        avatar: "🦊",
        choice: 2,
        correct: false,
        pointsEarned: 0,
        score: 850,
      },
      {
        playerId: "owl",
        name: "貓頭鷹",
        avatar: "🦉",
        choice: null,
        correct: false,
        pointsEarned: 0,
        score: 760,
      },
      {
        playerId: "rabbit",
        name: "兔子",
        avatar: "🐰",
        choice: 3,
        correct: false,
        pointsEarned: 0,
        score: 610,
      },
    ],
    leaderboard: board,
  };
}

export default function ScoreRaceDemoPage() {
  const [mode, setMode] = useState<"reveal" | "final">("reveal");
  const [seed, setSeed] = useState(0);

  const state = useMemo(
    () => (mode === "reveal" ? buildRevealState(seed) : buildFinalState(seed)),
    [mode, seed]
  );

  function replay() {
    setSeed((n) => n + 1);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <AccentLabel className="tracking-[0.25em]">Demo</AccentLabel>
          <h1 className="font-display text-4xl text-ink md:text-5xl">
            衝分排名範例
          </h1>
          <p className="mt-2 max-w-xl text-muted">
            用固定假資料重播動畫。公布模式會看到超車／被超；最終模式從 0
            衝到總分後停住。
          </p>
        </div>
        <Button href="/" variant="ghost" size="sm">
          回首頁
        </Button>
      </header>

      <Panel className="animate-fade-up" padding="md">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={mode === "reveal" ? "primary" : "default"}
            size="md"
            display
            onClick={() => {
              setMode("reveal");
              setSeed((n) => n + 1);
            }}
          >
            本題公布（超車）
          </Button>
          <Button
            type="button"
            variant={mode === "final" ? "primary" : "default"}
            size="md"
            display
            onClick={() => {
              setMode("final");
              setSeed((n) => n + 1);
            }}
          >
            最終總分
          </Button>
          <Button type="button" variant="accent" size="md" display onClick={replay}>
            再播一次
          </Button>
        </div>
        <ul className="mt-4 space-y-1 text-sm text-muted">
          <li>
            · 開局分數：🦊850←800、🦉760←750、🐱920←700、🐼880←650、🐰610←600
          </li>
          <li>· 預期：🐱／🐼 出現「超車！」；🦊／🦉 出現「被超了…」；結束 🐱 金冠</li>
          <li>· 橘色外框＝你（highlightId）</li>
          <li>· 最終模式：即使帶上一題 reveal，也應從 0 衝到總分</li>
        </ul>
      </Panel>

      <ScoreRace
        key={`${mode}-${seed}`}
        state={state}
        highlightId="cat"
        title={mode === "reveal" ? "衝分排名（示範）" : "最終總分衝刺（示範）"}
        large
        durationMs={mode === "final" ? 4200 : 3400}
      />

      <p className="text-center text-sm text-faint">
        路徑：
        <Link href="/demo/score-race" className="text-[var(--orange-deep)] underline">
          /demo/score-race
        </Link>
      </p>
    </main>
  );
}
