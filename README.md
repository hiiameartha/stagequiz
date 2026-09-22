# StageQuiz

Host／Client 即時限時問答競賽。支援圖片題、音訊／YouTube 猜歌、動物頭像、展示屏投影，以及可選的 Postgres 持久化。

## 功能

- **控場**：`/host` 編輯共用題庫、建房、控場；`/host/display` 大螢幕展示
- **挑戰者**：`/join` 輸入 6 碼房號、暱稱與動物頭像（最多 20 人）
- **媒體題**：圖片 URL；音訊檔或 YouTube（猜歌只播聲音、等化器播放，不露畫面）
- **音樂倒數**：音訊／YouTube 題在 Host／展示屏按下播放後才開始計時
- **公布答案**：YouTube 題可彈出正解影片預覽
- **持久化（可選）**：題庫雲端儲存、房間 rejoin、近期比賽歷史（見 [DEPLOY.md](DEPLOY.md)）
- **UI**：淺色 neumorphic 風格（`#fefefe`／`#fe811f`／`#333237`）、共用 Button／Panel 元件、按鈕 hover 跑馬燈邊框

## 啟動

```bash
npm install
npm run dev
```

有 Postgres 時：

```bash
cp .env.example .env   # 填 DATABASE_URL
npm run db:push
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

| 角色 | 路徑 |
|------|------|
| Host 控場台 | `/host` |
| 投影展示屏 | `/host/display` |
| 挑戰者 | `/join` |

## 流程

1. Host 編輯題目（可先「儲存題庫」到雲端）後建立房間  
2. 挑戰者加入大廳（題目內容暫不公開）  
3. Host 或展示屏開始競賽 → 作答中限時搶答  
4. 音樂題：Host／展示屏播放後才倒數；時間到或全員交卷 → 公布正解與得分  
5. 下一題 → 最終名次（領獎台＋長條圖）

## 計分

答對才得分：

```text
floor(basePoints * (0.5 + 0.5 * remainingMs / timeLimitMs))
```

## 腳本

| 指令 | 說明 |
|------|------|
| `npm run dev` | 本機一體（Next + Socket） |
| `npm run dev:web` | 僅 Next |
| `npm run realtime` | 僅 Socket realtime |
| `npm run dev:split` | 前端＋realtime 同時跑（需 `NEXT_PUBLIC_SOCKET_URL`） |
| `npm run db:push` | 依 schema 建立／更新 Postgres 表 |
| `npm run build` / `npm start` | 正式建置與啟動 |

部署與 Vercel／Realtime 拆分請見 [DEPLOY.md](DEPLOY.md)。
