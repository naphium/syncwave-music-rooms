import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Nav, Footer } from "@/components/Brand";
import { useSettings } from "@/hooks/useSettings";
import { saveSettings, verifyOwner, type SiteSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/owner")({
  head: () => ({
    meta: [
      { title: "Owner Console — SyncWave" },
      { name: "description", content: "Site owner settings for SyncWave." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Owner Console — SyncWave" },
      { property: "og:description", content: "Site owner settings for SyncWave." },
    ],
  }),
  component: Owner,
});

const FIELDS: { k: keyof SiteSettings; label: string }[] = [
  { k: "site_name", label: "Site name" }, { k: "tagline", label: "Tagline" }, { k: "announcement", label: "Announcement banner (empty = hidden)" },
  { k: "portfolio", label: "Portfolio URL" }, { k: "github", label: "GitHub URL" }, { k: "instagram", label: "Instagram URL" },
  { k: "facebook", label: "Facebook URL" }, { k: "donate", label: "Donate URL" },
];

function Owner() {
  const current = useSettings();
  const qc = useQueryClient();
  const [pass, setPass] = useState(""); const [ok, setOk] = useState(false);
  const [form, setForm] = useState<SiteSettings | null>(null); const [msg, setMsg] = useState("");
  const f = form ?? current;
  return (
    <div className="min-h-screen"><Nav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-display flex items-center gap-2 text-3xl font-bold"><ShieldCheck className="h-7 w-7 text-primary" />Owner Console</h1>
        {!ok ? (
          <form className="glass neon-border mt-6 space-y-3 rounded-2xl p-6" onSubmit={async (e) => {
            e.preventDefault(); const r = await verifyOwner({ data: { passcode: pass } });
            if (r.ok) { setOk(true); setMsg(""); } else setMsg("Wrong passcode.");
          }}>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="input" placeholder="Owner passcode" />
            <button className="btn-neon w-full">Unlock</button>
            {msg && <p className="text-sm text-destructive">{msg}</p>}
          </form>
        ) : (
          <form className="glass mt-6 space-y-4 rounded-2xl p-6" onSubmit={async (e) => {
            e.preventDefault(); setMsg("Saving…");
            try { await saveSettings({ data: { passcode: pass, settings: { site_name: f.site_name, tagline: f.tagline, announcement: f.announcement, accent_hue: f.accent_hue, portfolio: f.portfolio, github: f.github, instagram: f.instagram, facebook: f.facebook, donate: f.donate } } });
              await qc.invalidateQueries({ queryKey: ["settings"] }); setMsg("Saved ✓"); }
            catch (err) { setMsg((err as Error).message); }
          }}>
            {FIELDS.map((x) => (
              <label key={x.k} className="block text-sm"><span className="text-muted-foreground">{x.label}</span>
                <input value={String(f[x.k])} onChange={(e) => setForm({ ...f, [x.k]: e.target.value })} className="input mt-1" /></label>
            ))}
            <label className="block text-sm"><span className="text-muted-foreground">Neon accent color ({f.accent_hue}°)</span>
              <input type="range" min={0} max={360} value={f.accent_hue} onChange={(e) => setForm({ ...f, accent_hue: Number(e.target.value) })} className="seek mt-2 w-full" /></label>
            <button className="btn-neon w-full">Save changes</button>
            {msg && <p className="text-center text-sm text-muted-foreground">{msg}</p>}
          </form>
        )}
      </main><Footer /></div>
  );
}
