"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  RoomState,
  ServerToClientEvents,
} from "@/lib/quiz/types";

export type QuizSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useQuizSocket() {
  const socketRef = useRef<QuizSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<RoomState | null>(null);

  useEffect(() => {
    const socket: QuizSocket = io({
      path: "/socket.io",
      autoConnect: true,
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
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(key, id);
  return id;
}
