import { useEffect, useRef } from "react";

export function Visualizer({ analyserRef, playing, hue }: { analyserRef: React.MutableRefObject<AnalyserNode | null>; playing: boolean; hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const playRef = useRef(playing);
  playRef.current = playing;
  useEffect(() => {
    const c = ref.current!; const g = c.getContext("2d")!;
    let raf = 0; const bins = new Uint8Array(128); let t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw); t += 0.05;
      const w = (c.width = c.clientWidth * 2), h = (c.height = c.clientHeight * 2);
      g.clearRect(0, 0, w, h);
      const an = analyserRef.current;
      let real = false;
      if (an) { an.getByteFrequencyData(bins); real = bins.some((b) => b > 0); }
      const n = 64, bw = w / n;
      for (let i = 0; i < n; i++) {
        const v = real ? bins[i] / 255 : playRef.current ? 0.25 + 0.5 * Math.abs(Math.sin(t * 1.7 + i * 0.35) * Math.cos(t * 0.6 + i * 0.12)) : 0.04;
        const bh = v * h;
        g.fillStyle = `oklch(0.8 0.2 ${(hue + i * 2) % 360})`;
        g.shadowColor = g.fillStyle; g.shadowBlur = 16;
        g.fillRect(i * bw + 2, h - bh, bw - 4, bh);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyserRef, hue]);
  return <canvas ref={ref} className="h-24 w-full" />;
}
