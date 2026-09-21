/**
 * Standalone Socket.io realtime server for Vercel (frontend) + Railway/Render (this).
 * Local: npm run realtime
 */
import "dotenv/config";
import { createServer } from "http";
import { attachQuizSocket } from "./attach-socket";

const listenHost = "0.0.0.0";
const port = Number(process.env.PORT || process.env.SOCKET_PORT || 3001);
const corsOrigin = process.env.CORS_ORIGIN || "*";

const httpServer = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "stagequiz-realtime" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

attachQuizSocket(httpServer, corsOrigin);

httpServer.listen(port, listenHost, () => {
  console.log(`> StageQuiz realtime on http://${listenHost}:${port}`);
});