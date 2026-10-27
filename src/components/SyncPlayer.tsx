import { useEffect, useRef } from "react";
import { positionAt, type RoomState } from "@/lib/room";

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

let ytReady: Promise<void> | null = null;
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise((res) => {
    if (window.YT?.Player) return res();
    window.onYouTubeIframeAPIReady = () => res();
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return ytReady;
}

type Props = {
  state: RoomState;
  now: () => number;
  unlocked: boolean;
  volume: number;
  onEnded: (qid: string) => void;
  onSync: (driftMs: number, status: "synced" | "resync" | "idle", duration: number, pos: number) => void;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
};

/**
 * Synchronized audio driver. Every 250ms compares the local playhead with the
 * universal target position derived from the NTP-corrected server clock.
 * |drift| > 50ms → nudge playbackRate (±2%); |drift| > 800ms → silent hard seek.
 */
export function SyncPlayer({ state, now, unlocked, volume, onEnded, onSync, analyserRef }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const ytHost = useRef<HTMLDivElement>(null);
  const yt = useRef<any>(null);
  const ytLoaded = useRef<string>("");
  const ctxRef = useRef<AudioContext | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const cbRef = useRef({ onEnded, onSync });
  cbRef.current = { onEnded, onSync };
  const track = state.current;
  const isYT = track?.source === "youtube";

  // Web Audio graph for the visualizer (needs user gesture → unlocked)
  useEffect(() => {
    if (!unlocked || ctxRef.current || !audioRef.current) return;
    try {
      const ctx = new AudioContext();
      const srcNode = ctx.createMediaElementSource(audioRef.current);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      srcNode.connect(an); an.connect(ctx.destination);
      ctxRef.current = ctx; analyserRef.current = an;
    } catch { /* visualizer falls back */ }
  }, [unlocked, analyserRef]);

  // Load source
  useEffect(() => {
    const a = audioRef.current;
    if (!track || !a) return;
    if (track.source !== "youtube") {
      yt.current?.stopVideo?.();
      if (a.src !== track.src) { a.src = track.src; a.load(); }
    } else {
      a.pause();
      loadYT().then(() => {
        if (!ytHost.current) return;
        if (!yt.current) {
          yt.current = new window.YT.Player(ytHost.current, {
            height: "1", width: "1", videoId: track.src,
            playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1 },
            events: {
              onReady: () => { ytLoaded.current = track.src; },
              onStateChange: (e: any) => { if (e.data === 0 && stateRef.current.current) cbRef.current.onEnded(stateRef.current.current.qid); },
            },
          });
        } else if (ytLoaded.current !== track.src) {
          ytLoaded.current = track.src;
          yt.current.cueVideoById?.(track.src);
        }
      });
    }
  }, [track?.qid, track?.src, track?.source]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    yt.current?.setVolume?.(Math.round(volume * 100));
  }, [volume, isYT]);

  // Sync loop
  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current;
      if (!s.current || !unlocked) { cbRef.current.onSync(0, "idle", 0, positionAt(s, now())); return; }
      const target = positionAt(s, now());
      if (s.current.source === "youtube") {
        const p = yt.current;
        if (!p?.getCurrentTime) return;
        const dur = p.getDuration?.() || s.current.duration;
        const st = p.getPlayerState?.();
        if (!s.playing) { if (st === 1) p.pauseVideo(); cbRef.current.onSync(0, "synced", dur, target); return; }
        if (target < 0) return;
        if (st !== 1 && st !== 3) { p.seekTo(target, true); p.playVideo(); }
        const drift = (p.getCurrentTime() - target) * 1000;
        if (Math.abs(drift) > 250) p.seekTo(target + 0.15, true);
        cbRef.current.onSync(drift, Math.abs(drift) < 120 ? "synced" : "resync", dur, target);
      } else {
        const a = audioRef.current!;
        const dur = isFinite(a.duration) ? a.duration : s.current.duration;
        if (!s.playing) {
          if (!a.paused) a.pause();
          if (Math.abs(a.currentTime - s.pausedPos) > 0.3) a.currentTime = s.pausedPos;
          cbRef.current.onSync(0, "synced", dur, target); return;
        }
        if (dur && target > dur + 0.5) return;
        if (a.paused) { a.currentTime = target; a.play().catch(() => {}); }
        const drift = (a.currentTime - target) * 1000;
        if (Math.abs(drift) > 800) { a.currentTime = target; a.playbackRate = 1; }
        else if (drift < -50) a.playbackRate = 1.02;
        else if (drift > 50) a.playbackRate = 0.98;
        else a.playbackRate = 1;
        cbRef.current.onSync(drift, Math.abs(drift) <= 50 ? "synced" : "resync", dur, target);
      }
    }, 250);
    return () => clearInterval(id);
  }, [now, unlocked]);

  return (
    <>
      <audio ref={audioRef} crossOrigin="anonymous" preload="auto"
        onEnded={() => track && onEnded(track.qid)} />
      <div className="pointer-events-none fixed -left-[9999px] h-px w-px overflow-hidden"><div ref={ytHost} /></div>
    </>
  );
}
