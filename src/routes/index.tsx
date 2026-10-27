import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Radio, Users, Zap, Music } from "lucide-react";
import { Nav, Footer } from "@/components/Brand";
import { useSettings } from "@/hooks/useSettings";
import { sha256, uid } from "@/lib/room";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SyncWave — Listen to music together, perfectly in sync" },
      { name: "description", content: "Create a free room, search any song and hear it in perfect sync with friends. By Md. Nafim Muttaki." },
      { property: "og:title", content: "SyncWave — Synchronized music rooms" },
      { property: "og:description", content: "Free music, shared queues and clock-synced playback for everyone in the room." },
    ],
  }),
  component: Home,
});

function Home() {
  const s = useSettings();
  const nav = useNavigate();
  const [name, setName] = useState(""); const [pw, setPw] = useState(""); const [join, setJoin] = useState("");
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = uid().slice(0, 6);
    sessionStorage.setItem(`sw-create-${id}`, JSON.stringify({ name: name.trim() || "Untitled room", pwHash: await sha256(pw) }));
    nav({ to: "/room/$id", params: { id } });
  };
  const doJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const v = join.trim(); if (!v) return;
    const id = v.includes("/room/") ? (v.split("/room/")[1] ?? "").split(/[?#/]/)[0] ?? v : v;
    nav({ to: "/room/$id", params: { id } });
  };
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4">
        <section className="relative py-20 text-center">
          <div className="ambient" />
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display relative text-5xl font-bold leading-tight md:text-7xl">
            <span className="neon-text text-primary">{s.site_name}</span><br />{s.tagline}
          </motion.h1>
          <p className="relative mx-auto mt-6 max-w-xl text-muted-foreground">Search any song for free, drop it in a shared queue, and every listener hears the same beat at the same moment.</p>
        </section>
        <section className="grid gap-6 md:grid-cols-2">
          <form onSubmit={create} className="glass neon-border space-y-3 rounded-3xl p-6">
            <h2 className="font-display flex items-center gap-2 text-2xl font-bold"><Radio className="h-5 w-5 text-primary" />Create a room</h2>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} className="input" placeholder="Room name" />
            <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" maxLength={100} className="input" placeholder="Password (optional)" />
            <button className="btn-neon w-full">Create & go live</button>
          </form>
          <form onSubmit={doJoin} className="glass space-y-3 rounded-3xl p-6">
            <h2 className="font-display flex items-center gap-2 text-2xl font-bold"><Users className="h-5 w-5 text-primary" />Join a room</h2>
            <input value={join} onChange={(e) => setJoin(e.target.value)} className="input" placeholder="Room ID or invite link" />
            <button className="btn-ghost w-full justify-center">Join</button>
          </form>
        </section>
        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {[{ i: Zap, t: "Clock-synced", d: "Network time sync and drift correction keep everyone together." },
            { i: Music, t: "Free music", d: "Search YouTube and Audius, paste links or upload your own files." },
            { i: Users, t: "Shared queue", d: "Add, upvote and reorder tracks with chat and live reactions." }].map((f) => (
            <div key={f.t} className="glass rounded-2xl p-5"><f.i className="h-6 w-6 text-primary" /><h3 className="mt-3 font-semibold">{f.t}</h3><p className="text-sm text-muted-foreground">{f.d}</p></div>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
