# StageQuiz 部署說明

## 為什麼不能「只」丟上 Vercel？

StageQuiz 依賴 **Socket.io 長連線**（房間、倒數、同步公布）。  
[Vercel](https://vercel.com) 的 Next.js 是 serverless／短生命週期，**無法穩定跑自訂 Socket.io server**。

因此要讓挑戰者從公開網址完整玩完一場，需要：

| 方案 | 前端 | 即時層 | 適合 |
|------|------|--------|------|
| **A（建議先驗證流程）** | Railway／Render 一體部署 | 同一進程 | 最快確認「能完整玩完」 |
| **B（你要的 Vercel）** | Vercel（Next） | Railway／Render（`realtime`） | 前端在 Vercel，挑戰者可連線 |

---

## 本機

```bash
cd /Users/eartha/Workspace/stagequiz
npm install
cp .env.example .env   # 可選：填 DATABASE_URL
npm run db:push        # 有 DATABASE_URL 時建立資料表
npm run build
npm run dev
```

未設定 `DATABASE_URL` 時仍可玩，但房間／題庫只在記憶體，重啟後消失。

---

## Postgres 持久化（建議）

在 **跑 Socket 的服務**（方案 A 本體，或方案 B 的 realtime）設定：

1. 建立 Postgres（Railway Postgres／Neon／Supabase 任一）
2. 環境變數 `DATABASE_URL=postgres://...`
3. 部署前或本機執行一次：`npm run db:push`

啟用後會持久化：

- Host 題庫（依瀏覽器 `quiz-host-id`）
- 進行中房間（重啟後可 rejoin 恢復進度）
- 比賽結束後的歷史排行（控場台「近期比賽」）

**Vercel 前端不需要** `DATABASE_URL`（歷史與房間都經 Socket／realtime 寫讀）。

---

## 方案 A：一體部署（最快驗證完整遊戲）

用 [Railway](https://railway.app) 或 [Render](https://render.com) 連 GitHub repo [`hiiameartha/stagequiz`](https://github.com/hiiameartha/stagequiz)：

- **Build**：`npm install && npm run build`
- **Start**：`npm start`（`server/index.ts` = Next + Socket）
- 不需設定 `NEXT_PUBLIC_SOCKET_URL`
- （建議）加 Postgres plugin，設 `DATABASE_URL`，並在 build 加 `npm run db:push` 或手動 push 一次

部署後用手機開同一網址 `/join`，Host 用 `/host`，走完一場即可驗證。

---

## 方案 B：Vercel 前端 + Realtime 服務

### 1) 部署 Realtime（Railway / Render）

- **Start command**：`npm run start:realtime`
- **Build**：`npm install`（可不跑 next build；若用 DB：`npm install && npm run db:push`）
- 環境變數：
  - `CORS_ORIGIN` = 你的 Vercel 網址，例如 `https://stagequiz.vercel.app`（也可先用 `*`）
  - `DATABASE_URL` = Postgres 連線字串（建議）
  - `PORT` 由平台自動注入

記下 Realtime 公開網址，例如 `https://stagequiz-realtime.up.railway.app`。

### 2) 部署前端到 Vercel

- Import GitHub `stagequiz`
- Framework：Next.js
- 環境變數：
  - `NEXT_PUBLIC_SOCKET_URL` = 上一步的 Realtime 網址（**不要**結尾斜線）

本機拆分測試：

```bash
cd /Users/eartha/Workspace/stagequiz
# 終端 1
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001 npm run dev:web
# 終端 2
npm run realtime
```

或一行：`NEXT_PUBLIC_SOCKET_URL=http://localhost:3001 npm run dev:split`

### 3) 驗證「挑戰者完整流程」

1. 電腦開 Vercel 網址 → `/host` 建房  
2. 手機開同一網址 → `/join` 輸入房號＋頭像  
3. 確認畫面顯示「已連線」／能進大廳  
4. 作答 → 公布 → 下一題 → 最終名次圖表  

若挑戰者一直「連線中」：多半是 `NEXT_PUBLIC_SOCKET_URL` 未設、設錯，或 Realtime 的 CORS／服務睡著（免費方案常見）。

---

## 環境變數摘要

| 變數 | 用在 | 說明 |
|------|------|------|
| `NEXT_PUBLIC_SOCKET_URL` | Vercel / 拆分本機 | Socket 伺服器根網址 |
| `CORS_ORIGIN` | Realtime | 允許的前端 origin |
| `DATABASE_URL` | 跑 Socket 的服務 | Postgres；未設則純記憶體 |
| `PORT` | 平台 | HTTP listen port |
