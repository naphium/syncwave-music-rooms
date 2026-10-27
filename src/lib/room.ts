import type { Track } from "./search.functions";

export type QueueItem = Track & { qid: string; votes: string[]; addedBy: string };
export type RoomState = {
  version: number;
  name: string;
  pwHash: string;
  current: QueueItem | null;
  queue: QueueItem[];
  playing: boolean;
  startAt: number; // server ms at which track position 0 would have been
  pausedPos: number; // seconds
};
export type ChatMsg = { id: string; user: string; text: string; at: number };
export type Member = { uid: string; name: string; joinedAt: number; drift: number; rtt: number; status: "synced" | "resync" | "idle" };

/** Socket-style event schema carried over Lovable Cloud realtime broadcast. */
export const EVENTS = {
  join: "room:join",
  stateReq: "room:state_request",
  state: "player:action",
  chat: "chat:message",
  react: "chat:reaction",
} as const;

export const emptyState = (name: string, pwHash: string): RoomState => ({
  version: 0, name, pwHash, current: null, queue: [], playing: false, startAt: 0, pausedPos: 0,
});

export async function sha256(s: string) {
  if (!s) return "";
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export const positionAt = (s: RoomState, serverNow: number) =>
  s.playing ? Math.max(0, (serverNow - s.startAt) / 1000) : s.pausedPos;

export const sortQueue = (q: QueueItem[]) => [...q].sort((a, b) => b.votes.length - a.votes.length);

export const uid = () => Math.random().toString(36).slice(2, 10);

export const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
