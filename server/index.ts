/**
 * All-in-one Next.js + Socket.io (local / Railway mono deploy).
 * For Vercel: use Next on Vercel + `server/realtime.ts` elsewhere.
 */
import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { attachQuizSocket } from "./attach-socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  attachQuizSocket(httpServer, process.env.CORS_ORIGIN || "*");

  httpServer.listen(port, hostname, () => {
    console.log(`> StageQuiz ready on http://${hostname}:${port}`);
  });
});
