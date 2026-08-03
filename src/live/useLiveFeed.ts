"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import protobuf from "protobufjs";
import { io, type Socket } from "socket.io-client";
import type { LiveMatch } from "@/src/domain/live";
import { mapLiveFeedGame, mergeLiveMatches } from "@/src/live/liveFeedMapper";

const DEFAULT_SOCKET_URL = "https://socket.smbet.net";
const PROTO_FILES = [
  "/protos/event.proto",
  "/protos/game.proto",
  "/protos/market.proto",
  "/protos/odd.proto",
  "/protos/scores.proto",
  "/protos/team.proto",
];

type LiveFeedState = {
  matches: LiveMatch[];
  isConnecting: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
};

const liveSocketUrl = (): string =>
  process.env.NEXT_PUBLIC_LIVE_SOCKET_URL?.trim() || DEFAULT_SOCKET_URL;

const decodePayload = (payload: unknown): Uint8Array | null => {
  if (typeof payload === "string") {
    const binary = window.atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
  if (payload instanceof Uint8Array) return payload;

  if (
    payload &&
    typeof payload === "object" &&
    typeof (payload as { data?: unknown }).data === "string"
  ) {
    return decodePayload((payload as { data: string }).data);
  }

  return null;
};

const gameListFromEnvelope = (value: unknown): unknown[] => {
  if (!value || typeof value !== "object") return [];
  const obj = (value as { obj?: unknown }).obj;
  return Array.isArray(obj) ? obj : [];
};

const normalizeDiff = (value: unknown): LiveMatch | null => {
  const mapped = mapLiveFeedGame(value);
  if (mapped) return mapped;

  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const std = raw.std ?? raw.id;
  if (std === null || std === undefined) return null;

  return mapLiveFeedGame({
    ...raw,
    std,
    bt: raw.bt ?? raw.odds,
    sc: raw.sc ?? raw.scores,
  });
};

export const useLiveFeed = (): LiveFeedState & { refresh: () => void } => {
  const socketRef = useRef<Socket | null>(null);
  const rootRef = useRef<protobuf.Root | null>(null);
  const [reconnectSeq, setReconnectSeq] = useState(0);
  const [state, setState] = useState<LiveFeedState>({
    matches: [],
    isConnecting: true,
    error: null,
    lastUpdatedAt: null,
  });

  const refresh = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.disconnect();
      socketRef.current = null;
    }
    setReconnectSeq((current) => current + 1);
    setState((current) => ({ ...current, isConnecting: true, error: null }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      try {
        const root = rootRef.current ?? (await protobuf.load(PROTO_FILES));
        if (cancelled) return;
        rootRef.current = root;
        const eventType = root.lookupType("bet720_protocol_buffers.Event");
        const socket = io(liveSocketUrl(), {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 5,
          timeout: 15000,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          setState((current) => ({
            ...current,
            isConnecting: false,
            error: null,
          }));
        });

        socket.on("connect_error", (error) => {
          setState((current) => ({
            ...current,
            isConnecting: false,
            error: error.message || "Live feed connection failed.",
          }));
        });

        socket.on("disconnect", () => {
          setState((current) => ({ ...current, isConnecting: false }));
        });

        socket.on("expired-key", (key: unknown) => {
          if (typeof key !== "string") return;
          const matchId = key.replace(/^live_game_/, "").replace(/^buffer_/, "");
          setState((current) => ({
            ...current,
            matches: current.matches.filter((match) => match.matchId !== matchId),
            lastUpdatedAt: new Date().toISOString(),
          }));
        });

        socket.on("buffers", (payload: unknown) => {
          const bytes = decodePayload(payload);
          if (!bytes) return;
          try {
            const decoded = eventType.toObject(eventType.decode(bytes), {
              arrays: true,
              objects: true,
            });
            const incoming = gameListFromEnvelope(decoded)
              .map(mapLiveFeedGame)
              .filter((match): match is LiveMatch => match !== null)
              .filter((match) => !match.league.includes("Esoccer"));
            if (incoming.length === 0) return;
            setState((current) => ({
              ...current,
              matches: mergeLiveMatches(current.matches, incoming),
              isConnecting: false,
              error: null,
              lastUpdatedAt: new Date().toISOString(),
            }));
          } catch {
            setState((current) => ({
              ...current,
              isConnecting: false,
              error: "A live feed update could not be decoded.",
            }));
          }
        });

        socket.on("buffer-diffs", (payload: unknown) => {
          try {
            const raw =
              typeof payload === "string" ? JSON.parse(payload) : payload;
            const match = normalizeDiff(raw);
            if (!match) return;
            setState((current) => ({
              ...current,
              matches: mergeLiveMatches(current.matches, [match]),
              isConnecting: false,
              error: null,
              lastUpdatedAt: new Date().toISOString(),
            }));
          } catch {
            setState((current) => ({
              ...current,
              isConnecting: false,
              error: "A live feed update could not be decoded.",
            }));
          }
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          isConnecting: false,
          error:
            error instanceof Error
              ? error.message
              : "Live feed connection failed.",
        }));
      }
    };

    void connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [reconnectSeq]);

  return useMemo(() => ({ ...state, refresh }), [refresh, state]);
};
