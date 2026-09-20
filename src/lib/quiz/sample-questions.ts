import type { Question } from "./types";

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "下列哪一個是日本首都？",
    options: ["大阪", "東京", "京都", "名古屋"],
    correctIndex: 1,
    timeLimitSec: 20,
    points: 1000,
  },
  {
    id: "q2",
    text: "這張圖裡的地標位於哪個城市？（範例圖 URL，可自行替換）",
    options: ["巴黎", "倫敦", "紐約", "羅馬"],
    correctIndex: 0,
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
    },
    timeLimitSec: 25,
    points: 1000,
  },
  {
    id: "q3",
    text: "這段旋律屬於哪種樂器為主的演奏？（可改成你的音檔 URL）",
    options: ["鋼琴", "吉他", "小提琴", "薩克斯風"],
    correctIndex: 0,
    media: {
      type: "audio",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    timeLimitSec: 30,
    points: 1200,
  },
];
