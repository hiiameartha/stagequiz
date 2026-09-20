# StageQuiz

- Host / Client 即時限時問答；音樂僅 Host／展示屏播放
- 大廳不公開題目內容；挑戰者選動物頭像
- 最終名次含領獎台與長條圖
- 可選 Postgres：題庫、房間狀態、比賽歷史持久化（見 [DEPLOY.md](DEPLOY.md)）

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

- **Host**：`/host` 建房、編輯題庫、控場；`/host/display` 投影展示屏
- **挑戰者**：`/join` 輸入 6 碼房號與暱稱

## 流程

1. Host 編輯題目後建立房間
2. 挑戰者加入大廳（上限 20）
3. Host 開始 → 全員限時作答
4. 時間到或全員交卷 → 公布正解與得分
5. 下一題 → 最終名次

## 計分

答對才得分：`floor(basePoints * (0.5 + 0.5 * remainingMs / timeLimitMs))`
