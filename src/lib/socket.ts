"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { createId } from "@/lib/id";
import type {
  ClientToServerEvents,
  RoomState,
  ServerToClientEvents,
} from "@/lib/quiz/types";

export type QuizSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function socketUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!url) return undefined; // same origin (local mono / Railway all-in-one)
  return url.replace(/\/$/, "");
}

export function useQuizSocket() {
  const socketRef = useRef<QuizSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<RoomState | null>(null);

  useEffect(() => {
    const url = socketUrl();
    const socket: QuizSocket = io(url, {
      path: "/socket.io",
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("room:state", (s) => setState(s));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { socket: socketRef, connected, state, setState };
}

export function getOrCreateId(key: string): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = createId();
  localStorage.setItem(key, id);
  return id;
}
