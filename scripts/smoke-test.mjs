import { io } from "socket.io-client";

function connect() {
  return new Promise((resolve, reject) => {
    const s = io("http://127.0.0.1:3000", { transports: ["websocket"] });
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
}

function waitState(s, pred, ms = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout waiting state")), ms);
    const handler = (st) => {
      if (pred(st)) {
        clearTimeout(t);
        s.off("room:state", handler);
        resolve(st);
      }
    };
    s.on("room:state", handler);
  });
}

async function main() {
  const host = await connect();
  const p1 = await connect();
  const p2 = await connect();

  const createAck = await new Promise((resolve) => {
    host.emit("room:create", { hostId: "host-1" }, resolve);
  });
  if (!createAck.ok) throw new Error(createAck.error);
  const { code } = createAck;
  console.log("room", code);

  const lobbyHost = await waitState(host, (s) => s.code === code);
  if (!lobbyHost.questions.length) throw new Error("host should see questions");
  console.log("host questionCount", lobbyHost.questionCount);

  const lobbyP1Promise = waitState(p1, (s) => s.playerCount === 2 && s.questions.length === 0);

  await new Promise((resolve, reject) => {
    p1.emit(
      "room:join",
      { code, playerId: "p1", name: "Alice", avatar: "fox" },
      (r) => (r?.ok ? resolve() : reject(new Error(r?.error)))
    );
  });
  await new Promise((resolve, reject) => {
    p2.emit(
      "room:join",
      { code, playerId: "p2", name: "Bob", avatar: "cat" },
      (r) => (r?.ok ? resolve() : reject(new Error(r?.error)))
    );
  });

  const lobbyP1 = await lobbyP1Promise;
  if (lobbyP1.currentQuestion !== null) throw new Error("lobby should hide current question");
  console.log("lobby players", lobbyP1.playerCount, "avatars ok");

  await new Promise((resolve, reject) => {
    host.emit("host:start", { code, hostId: "host-1" }, (r) =>
      r?.ok ? resolve() : reject(new Error(r?.error))
    );
  });

  const answering = await waitState(p1, (s) => s.phase === "answering");
  console.log("answering q", answering.currentIndex, answering.currentQuestion?.text);
  if (answering.currentQuestion?.correctIndex !== undefined) {
    throw new Error("correctIndex leaked during answering");
  }
  if (answering.currentQuestion?.media?.type === "audio" && answering.currentQuestion.media.url) {
    throw new Error("audio url should be stripped for players");
  }

  await new Promise((resolve, reject) => {
    p1.emit("answer:submit", { code, playerId: "p1", choice: 1 }, (r) =>
      r?.ok ? resolve() : reject(new Error(r?.error))
    );
  });
  await new Promise((resolve, reject) => {
    p2.emit("answer:submit", { code, playerId: "p2", choice: 0 }, (r) =>
      r?.ok ? resolve() : reject(new Error(r?.error))
    );
  });

  let reveal = await waitState(host, (s) => s.phase === "reveal");
  console.log("reveal correct", reveal.currentQuestion?.correctIndex);
  console.log(
    "scores",
    reveal.leaderboard.map((x) => `${x.name}:${x.score}`).join(", ")
  );
  if (reveal.currentQuestion?.correctIndex !== 1) {
    throw new Error("expected correctIndex 1 for sample q1");
  }
  if ((reveal.leaderboard.find((x) => x.id === "p1")?.score ?? 0) <= 0) {
    throw new Error("Alice should have scored");
  }
  if (!reveal.leaderboard[0]?.avatar) throw new Error("avatar missing on leaderboard");

  // Advance remaining questions via force reveal
  while (true) {
    const ack = await new Promise((resolve) => {
      host.emit("host:next", { code, hostId: "host-1" }, resolve);
    });
    if (!ack?.ok) throw new Error(ack?.error ?? "next failed");

    const st = await waitState(
      host,
      (s) => s.phase === "answering" || s.phase === "final",
      3000
    ).catch(async () => {
      // state may have arrived before listener; rejoin to get snapshot
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("rejoin timeout")), 3000);
        host.once("room:state", (s) => {
          clearTimeout(t);
          resolve(s);
        });
        host.emit("room:rejoin", { code, playerId: "host-1", role: "host" });
      });
    });

    if (st.phase === "final") {
      console.log(
        "final",
        st.leaderboard.map((x) => `${x.name}:${x.score}`).join(", ")
      );
      break;
    }

    if (st.currentQuestion?.media?.type === "audio") {
      if (!st.currentQuestion.media.url) throw new Error("host should keep audio url");
      const pAudio = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("player audio check timeout")), 3000);
        p1.once("room:state", (s) => {
          clearTimeout(t);
          resolve(s);
        });
        p1.emit("room:rejoin", { code, playerId: "p1", role: "player" });
      });
      if (pAudio.currentQuestion?.media?.url) {
        throw new Error("player should not get audio url");
      }
      console.log("audio stripped for player OK");
    }

    await new Promise((resolve) => {
      host.emit("host:forceReveal", { code, hostId: "host-1" }, resolve);
    });
    await waitState(host, (s) => s.phase === "reveal", 3000).catch(() =>
      new Promise((resolve) => {
        host.once("room:state", resolve);
        host.emit("room:rejoin", { code, playerId: "host-1", role: "host" });
      })
    );
  }

  console.log("OK");
  host.close();
  p1.close();
  p2.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
