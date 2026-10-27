import { useEffect, useRef, useState } from "react";
import { getServerTime } from "@/lib/settings.functions";

/**
 * NTP-style clock sync. offset = ((t1 - t0) + (t2 - t3)) / 2,
 * keeping the sample with the lowest round-trip (least jitter).
 */
export function useClockSync() {
  const offsetRef = useRef(0);
  const [state, setState] = useState({ offset: 0, rtt: 0, synced: false });

  useEffect(() => {
    let alive = true;
    async function burst() {
      const samples: { offset: number; rtt: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const t0 = Date.now();
        try {
          const { t1, t2 } = await getServerTime();
          const t3 = Date.now();
          samples.push({ offset: ((t1 - t0) + (t2 - t3)) / 2, rtt: (t3 - t0) - (t2 - t1) });
        } catch { /* skip */ }
      }
      if (!alive || !samples.length) return;
      samples.sort((a, b) => a.rtt - b.rtt);
      const best = samples.slice(0, 3);
      const offset = best.reduce((s, x) => s + x.offset, 0) / best.length;
      offsetRef.current = offset;
      setState({ offset, rtt: best[0]!.rtt, synced: true });
    }
    burst();
    const id = setInterval(burst, 20000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const now = () => Date.now() + offsetRef.current;
  return { ...state, now };
}
