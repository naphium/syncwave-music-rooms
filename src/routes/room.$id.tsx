import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, Search, Upload, Link2, ThumbsUp, Trash2, Copy, Lock, Volume2, ListMusic, MessageSquare, X, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClockSync } from "@/hooks/useClockSync";
import { SyncPlayer } from "@/components/SyncPlayer";
import { Visualizer } from "@/components/Visualizer";
import { Nav, Footer } from "@/components/Brand";
import { searchMusic, type Track } from "@/lib/search.functions";
import { EVENTS, emptyState, fmt, positionAt, sha256, sortQueue, uid, type ChatMsg, type Member, type QueueItem, type RoomState } from "@/lib/room";

export const Route = createFileRoute("/room/$id")({
  head: () => ({
    meta: [
      { title: "Listening Room — SyncWave" },
      { name: "description", content: "Join a synchronized listening room and hear every beat at the same moment." },
      { property: "og:title", content: "Listening Room — SyncWave" },
      { property: "og:description", content: "Join a synchronized listening room on SyncWave." },
    ],
  }),
  component: Room,
});

const REACTIONS = ["🎉", "🔥", "❤️", "🔊"];
const hueOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

function Room() {
  const { id } = Route.useParams();
  const clock = useClockSync();
  const nowRef = useRef(clock.now); nowRef.current = clock.now;
  const now = useCallback(() => nowRef.current(), []);

  const me = useMemo(() => ({ uid: uid(), joinedAt: Date.now() }), []);
  const [name, setName] = useState("");
  const [state, setState] = useState<RoomState | null>(null);
  const stateRef = useRef<RoomState | null>(null); stateRef.current = state;
  const [unlockedPw, setUnlockedPw] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [floaters, setFloaters] = useState<{ id: string; e: string; x: number }[]>([]);
  const [sync, setSync] = useState({ drift: 0, status: "idle" as Member["status"], dur: 0, pos: 0 });
  const [volume, setVolume] = useState(0.8);
  const [drawer, setDrawer] = useState<"queue" | "chat" | null>(null);
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => { setName(localStorage.getItem("sw-name") || `Listener-${me.uid.slice(0, 4)}`); }, [me.uid]);

  // Realtime channel
  useEffect(() => {
    const ch = supabase.channel(`room-${id}`, { config: { presence: { key: me.uid }, broadcast: { self: false } } });
    chanRef.current = ch;
    const apply = (s: RoomState) => { if (!stateRef.current || s.version > stateRef.current.version) setState(s); };
    ch.on("broadcast", { event: EVENTS.state }, ({ payload }) => apply(payload as RoomState))
      .on("broadcast", { event: EVENTS.stateReq }, () => {
        if (stateRef.current) setTimeout(() => ch.send({ type: "broadcast", event: EVENTS.state, payload: stateRef.current }), Math.random() * 300);
      })
      .on("broadcast", { event: EVENTS.chat }, ({ payload }) => setChat((c) => [...c.slice(-99), payload as ChatMsg]))
      .on("broadcast", { event: EVENTS.react }, ({ payload }) => float(payload.e))
      .on("presence", { event: "sync" }, () => {
        const ps = ch.presenceState<Member>();
        setMembers(Object.values(ps).map((a) => a[0] as Member).filter(Boolean).sort((a, b) => a.joinedAt - b.joinedAt));
      })
      .subscribe(async (st) => {
        if (st !== "SUBSCRIBED") return;
        const intent = sessionStorage.getItem(`sw-create-${id}`);
        if (intent) { const { name, pwHash } = JSON.parse(intent); setState(emptyState(name, pwHash)); setUnlockedPw(true); }
        ch.send({ type: "broadcast", event: EVENTS.stateReq, payload: {} });
        setTimeout(() => { if (!stateRef.current) setState(emptyState(`Room ${id}`, "")); }, 3500);
      });
    return () => { supabase.removeChannel(ch); };
  }, [id, me.uid]);

  // Presence heartbeat with sync status
  const syncRef = useRef(sync); syncRef.current = sync;
  useEffect(() => {
    const t = setInterval(() => {
      chanRef.current?.track({ uid: me.uid, name, joinedAt: me.joinedAt, drift: Math.round(syncRef.current.drift), rtt: Math.round(clock.rtt), status: syncRef.current.status } satisfies Member);
    }, 2000);
    return () => clearInterval(t);
  }, [name, me, clock.rtt]);

  const commit = useCallback((fn: (s: RoomState) => RoomState) => {
    const cur = stateRef.current; if (!cur) return;
    const next = { ...fn(cur), version: cur.version + 1 };
    setState(next); stateRef.current = next;
    chanRef.current?.send({ type: "broadcast", event: EVENTS.state, payload: next });
  }, []);

  const LEAD = 700; // schedule commands ahead: "play at server timestamp T"
  const playItem = (s: RoomState, item: QueueItem | null): RoomState =>
    ({ ...s, current: item, playing: !!item, startAt: now() + LEAD, pausedPos: 0 });

  const actions = {
    toggle: () => commit((s) => s.playing
      ? { ...s, playing: false, pausedPos: positionAt(s, now()) }
      : { ...s, playing: true, startAt: now() + LEAD - s.pausedPos * 1000 }),
    seek: (pos: number) => commit((s) => s.playing ? { ...s, startAt: now() + LEAD - pos * 1000 } : { ...s, pausedPos: pos }),
    next: () => commit((s) => { const q = sortQueue(s.queue); return { ...playItem(s, q[0] ?? null), queue: q.slice(1) }; }),
    add: (t: Track) => commit((s) => {
      const item: QueueItem = { ...t, qid: uid(), votes: [], addedBy: name };
      return s.current ? { ...s, queue: [...s.queue, item] } : playItem(s, item);
    }),
    vote: (qid: string) => commit((s) => ({ ...s, queue: s.queue.map((q) => q.qid !== qid ? q : { ...q, votes: q.votes.includes(me.uid) ? q.votes.filter((v) => v !== me.uid) : [...q.votes, me.uid] }) })),
    remove: (qid: string) => commit((s) => ({ ...s, queue: s.queue.filter((q) => q.qid !== qid) })),
    up: (qid: string) => commit((s) => { const q = [...s.queue]; const i = q.findIndex((x) => x.qid === qid); if (i > 0) [q[i - 1], q[i]] = [q[i]!, q[i - 1]!]; return { ...s, queue: q }; }),
  };

  const isLeader = members[0]?.uid === me.uid || members.length === 0;
  const onEnded = useCallback((qid: string) => {
    if (isLeader && stateRef.current?.current?.qid === qid) actions.next();
  }, [isLeader]); // eslint-disable-line react-hooks/exhaustive-deps

  function float(e: string) {
    const f = { id: uid(), e, x: 10 + Math.random() * 80 };
    setFloaters((x) => [...x, f]);
    setTimeout(() => setFloaters((x) => x.filter((y) => y.id !== f.id)), 2500);
  }
  const react = (e: string) => { float(e); chanRef.current?.send({ type: "broadcast", event: EVENTS.react, payload: { e } }); };
  const sendChat = (text: string) => {
    const m: ChatMsg = { id: uid(), user: name, text, at: Date.now() };
    setChat((c) => [...c, m]); chanRef.current?.send({ type: "broadcast", event: EVENTS.chat, payload: m });
  };

  if (!state) return <Shell><div className="py-32 text-center text-muted-foreground">Connecting to room <span className="text-primary">{id}</span>…</div></Shell>;
  if (state.pwHash && !unlockedPw) return <Shell><PasswordGate hash={state.pwHash} onOk={() => setUnlockedPw(true)} /></Shell>;

  const t = state.current;
  const hue = t ? hueOf(t.title) : 190;
  const pos = Math.min(sync.pos, sync.dur || Infinity);

  return (
    <Shell>
      <div style={{ ["--hue" as string]: hue } as React.CSSProperties} className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <SyncPlayer state={state} now={now} unlocked={audioOn} volume={volume} onEnded={onEnded} analyserRef={analyserRef}
          onSync={(drift, status, dur, p) => setSync({ drift, status, dur, pos: p })} />
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Room · {id}</p>
              <h1 className="font-display text-3xl font-bold">{state.name}</h1>
            </div>
            <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="btn-ghost"><Copy className="h-4 w-4" />Copy invite link</button>
          </div>

          <div className="glass neon-border relative overflow-hidden rounded-3xl p-6">
            <div className="ambient" />
            <div className="relative grid gap-6 md:grid-cols-[260px_1fr] md:items-center">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted neon-glow">
                {t?.artwork ? <img src={t.artwork} alt={t.title} className="h-full w-full object-cover" /> :
                  <div className="flex h-full items-center justify-center text-6xl">🎧</div>}
              </div>
              <div className="min-w-0 space-y-4">
                <div>
                  <h2 className="font-display truncate text-2xl font-bold">{t?.title ?? "Nothing playing"}</h2>
                  <p className="text-muted-foreground">{t ? `${t.artist} · added by ${t.addedBy}` : "Search and add a track to start the party"}</p>
                </div>
                <Visualizer analyserRef={analyserRef} playing={state.playing && audioOn} hue={hue} />
                <div>
                  <input type="range" min={0} max={sync.dur || 1} step={0.5} value={pos} disabled={!t}
                    onChange={(e) => actions.seek(Number(e.target.value))} className="seek w-full" />
                  <div className="flex justify-between text-xs text-muted-foreground"><span>{fmt(pos)}</span><span>{fmt(sync.dur)}</span></div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={actions.toggle} disabled={!t} className="btn-neon h-14 w-14 rounded-full p-0">
                    {state.playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </button>
                  <button onClick={actions.next} className="btn-ghost"><SkipForward className="h-4 w-4" />Next</button>
                  <div className="ml-auto flex items-center gap-2"><Volume2 className="h-4 w-4 text-muted-foreground" />
                    <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="seek w-24" /></div>
                </div>
              </div>
            </div>
            {!audioOn && (
              <button onClick={() => setAudioOn(true)} className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur">
                <span className="btn-neon">🔊 Tap to join synced audio</span>
                <span className="text-xs text-muted-foreground">Browsers need one tap before sound can play</span>
              </button>
            )}
            <div className="pointer-events-none absolute inset-0">
              <AnimatePresence>{floaters.map((f) => (
                <motion.span key={f.id} initial={{ y: 0, opacity: 1 }} animate={{ y: -260, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 2.4 }}
                  className="absolute bottom-4 text-4xl" style={{ left: `${f.x}%` }}>{f.e}</motion.span>))}</AnimatePresence>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {REACTIONS.map((e) => <button key={e} onClick={() => react(e)} className="glass rounded-full px-4 py-2 text-xl transition hover:scale-110">{e}</button>)}
            <span className="ml-auto text-xs text-muted-foreground">Clock offset {clock.offset.toFixed(1)}ms · RTT {clock.rtt.toFixed(0)}ms</span>
          </div>

          <MusicSearch onAdd={actions.add} />

          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 font-semibold">Listeners ({members.length})</h3>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <div key={m.uid} className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
                  <span className={`h-2 w-2 rounded-full ${m.status === "synced" ? "bg-success" : m.status === "resync" ? "bg-warning animate-pulse" : "bg-muted-foreground"}`} />
                  {m.name}{m.uid === me.uid && " (you)"}
                  <span className="text-xs text-muted-foreground">{m.status === "synced" ? `Synced ${Math.abs(m.drift)}ms` : m.status === "resync" ? "Resyncing…" : "Idle"}</span>
                </div>
              ))}
            </div>
            <input value={name} onChange={(e) => { setName(e.target.value); localStorage.setItem("sw-name", e.target.value); }} maxLength={24}
              className="input mt-3 max-w-xs" placeholder="Your display name" />
          </div>
        </section>

        <aside className={`${drawer ? "fixed inset-0 z-50 overflow-y-auto bg-background p-4" : "hidden"} space-y-4 lg:static lg:block lg:bg-transparent lg:p-0`}>
          {drawer && <button onClick={() => setDrawer(null)} className="btn-ghost lg:hidden"><X className="h-4 w-4" />Close</button>}
          <div className={drawer === "chat" ? "hidden lg:block" : ""}>
            <QueuePanel queue={sortQueue(state.queue)} me={me.uid} {...actions} />
          </div>
          <div className={drawer === "queue" ? "hidden lg:block" : ""}><ChatPanel chat={chat} onSend={sendChat} /></div>
        </aside>
        <div className="fixed bottom-4 right-4 z-40 flex gap-2 lg:hidden">
          <button onClick={() => setDrawer("queue")} className="btn-neon"><ListMusic className="h-4 w-4" />Queue</button>
          <button onClick={() => setDrawer("chat")} className="btn-neon"><MessageSquare className="h-4 w-4" />Chat</button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen"><Nav />{children}<Footer /></div>;
}

function PasswordGate({ hash, onOk }: { hash: string; onOk: () => void }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(false);
  return (
    <form className="glass neon-border mx-auto mt-24 max-w-sm space-y-4 rounded-2xl p-6" onSubmit={async (e) => {
      e.preventDefault(); if ((await sha256(pw)) === hash) onOk(); else setErr(true);
    }}>
      <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Lock className="h-5 w-5 text-primary" />Password required</h2>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="input" placeholder="Room password" autoFocus />
      {err && <p className="text-sm text-destructive">Wrong password</p>}
      <button className="btn-neon w-full">Enter room</button>
      <Link to="/" className="block text-center text-sm text-muted-foreground">Back home</Link>
    </form>
  );
}

function MusicSearch({ onAdd }: { onAdd: (t: Track) => void }) {
  const [q, setQ] = useState(""); const [res, setRes] = useState<Track[]>([]); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(""); const [link, setLink] = useState("");
  const run = async (e: React.FormEvent) => {
    e.preventDefault(); if (!q.trim()) return; setBusy(true); setMsg("");
    try { const r = await searchMusic({ data: { q } }); setRes(r); if (!r.length) setMsg("No results — try another search."); }
    catch { setMsg("Search failed, please retry."); } finally { setBusy(false); }
  };
  const addLink = () => {
    const u = link.trim(); if (!u) return;
    const yt = u.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/);
    if (yt?.[1]) onAdd({ id: yt[1], source: "youtube", title: "YouTube track", artist: "Direct link", artwork: `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`, duration: 0, src: yt[1]! });
    else onAdd({ id: u, source: "url", title: decodeURIComponent(u.split("/").pop() || "Audio link"), artist: "Direct link", artwork: "", duration: 0, src: u });
    setLink("");
  };
  const upload = async (f: File) => {
    setMsg("Uploading…");
    const path = `${uid()}-${f.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("uploads").upload(path, f, { contentType: f.type });
    if (error) { setMsg("Upload failed"); return; }
    const { data } = await supabase.storage.from("uploads").createSignedUrl(path, 60 * 60 * 24 * 7);
    if (data) onAdd({ id: path, source: "url", title: f.name, artist: "Uploaded", artwork: "", duration: 0, src: data.signedUrl });
    setMsg("");
  };
  return (
    <div className="glass space-y-3 rounded-2xl p-4">
      <form onSubmit={run} className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-9" placeholder="Search any song, artist or cover — free" /></div>
        <button className="btn-neon" disabled={busy}>{busy ? "…" : "Search"}</button>
      </form>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1"><Link2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input value={link} onChange={(e) => setLink(e.target.value)} className="input pl-9" placeholder="Paste YouTube or direct audio URL (.mp3, .wav…)" /></div>
        <button onClick={addLink} className="btn-ghost">Add link</button>
        <label className="btn-ghost cursor-pointer"><Upload className="h-4 w-4" />Upload
          <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
      </div>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {res.map((t) => (
          <button key={t.id} onClick={() => onAdd(t)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-accent">
            {t.artwork ? <img src={t.artwork} alt="" className="h-10 w-14 rounded object-cover" /> : <div className="h-10 w-14 rounded bg-muted" />}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.title}</p><p className="truncate text-xs text-muted-foreground">{t.artist} · {t.source} · {fmt(t.duration)}</p></div>
            <span className="text-xs text-primary">+ Add</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function QueuePanel({ queue, me, vote, remove, up }: { queue: QueueItem[]; me: string; vote: (q: string) => void; remove: (q: string) => void; up: (q: string) => void }) {
  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold"><ListMusic className="h-4 w-4 text-primary" />Up next ({queue.length})</h3>
      {!queue.length && <p className="text-sm text-muted-foreground">Queue is empty.</p>}
      <div className="space-y-1">
        {queue.map((q) => (
          <div key={q.qid} className="flex items-center gap-2 rounded-xl p-2 hover:bg-accent">
            <div className="min-w-0 flex-1"><p className="truncate text-sm">{q.title}</p><p className="truncate text-xs text-muted-foreground">{q.artist} · {q.addedBy}</p></div>
            <button onClick={() => up(q.qid)} title="Move up" className="text-muted-foreground hover:text-primary"><ArrowUp className="h-4 w-4" /></button>
            <button onClick={() => vote(q.qid)} className={`flex items-center gap-1 text-xs ${q.votes.includes(me) ? "text-primary" : "text-muted-foreground"}`}><ThumbsUp className="h-4 w-4" />{q.votes.length}</button>
            <button onClick={() => remove(q.qid)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPanel({ chat, onSend }: { chat: ChatMsg[]; onSend: (t: string) => void }) {
  const [t, setT] = useState(""); const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [chat.length]);
  return (
    <div className="glass flex h-96 flex-col rounded-2xl p-4">
      <h3 className="mb-2 flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4 text-primary" />Chat</h3>
      <div className="flex-1 space-y-2 overflow-y-auto text-sm">
        {chat.map((m) => <p key={m.id}><span className="font-semibold text-primary">{m.user}: </span>{m.text}</p>)}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (t.trim()) { onSend(t.trim().slice(0, 500)); setT(""); } }} className="mt-2 flex gap-2">
        <input value={t} onChange={(e) => setT(e.target.value)} className="input" placeholder="Say something…" />
        <button className="btn-neon">Send</button>
      </form>
    </div>
  );
}
