import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Track = {
  id: string; source: "youtube" | "audius" | "url";
  title: string; artist: string; artwork: string; duration: number; src: string;
};

const INVIDIOUS = ["https://inv.nadeko.net", "https://invidious.nerdvpn.de", "https://yewtu.be", "https://invidious.f5.si"];

async function timed(url: string, ms = 5000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { signal: c.signal, headers: { "User-Agent": "Mozilla/5.0" } }); }
  finally { clearTimeout(t); }
}

async function searchYouTube(q: string): Promise<Track[]> {
  for (const base of INVIDIOUS) {
    try {
      const r = await timed(`${base}/api/v1/search?type=video&q=${encodeURIComponent(q)}`);
      if (!r.ok) continue;
      const j = (await r.json()) as Array<{ type: string; videoId: string; title: string; author: string; lengthSeconds: number }>;
      return j.filter((v) => v.type === "video").slice(0, 15).map((v) => ({
        id: `yt-${v.videoId}`, source: "youtube", title: v.title, artist: v.author,
        artwork: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`, duration: v.lengthSeconds, src: v.videoId,
      }));
    } catch { /* try next */ }
  }
  return [];
}

async function searchAudius(q: string): Promise<Track[]> {
  try {
    const r = await timed(`https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=syncwave`);
    if (!r.ok) return [];
    const j = (await r.json()) as { data: Array<{ id: string; title: string; duration: number; user: { name: string }; artwork?: Record<string, string> }> };
    return j.data.slice(0, 10).map((t) => ({
      id: `au-${t.id}`, source: "audius", title: t.title, artist: t.user?.name ?? "Audius",
      artwork: t.artwork?.["480x480"] ?? "", duration: t.duration,
      src: `https://api.audius.co/v1/tracks/${t.id}/stream?app_name=syncwave`,
    }));
  } catch { return []; }
}

export const searchMusic = createServerFn({ method: "GET" })
  .inputValidator((i: { q: string }) => z.object({ q: z.string().min(1).max(120) }).parse(i))
  .handler(async ({ data }) => {
    const [yt, au] = await Promise.all([searchYouTube(data.q), searchAudius(data.q)]);
    return [...yt, ...au];
  });
