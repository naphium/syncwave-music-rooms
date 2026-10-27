import { Link } from "@tanstack/react-router";
import { Github, Instagram, Facebook, Globe, Coffee, Radio } from "lucide-react";
import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";

export function Nav() {
  const s = useSettings();
  useEffect(() => { document.documentElement.style.setProperty("--hue", String(s.accent_hue)); }, [s.accent_hue]);
  return (
    <header className="glass sticky top-0 z-40 border-b border-border">
      {s.announcement && <div className="bg-primary/15 py-1 text-center text-xs text-primary">{s.announcement}</div>}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary neon-text" />
          <span className="font-display text-xl font-bold tracking-wider">{s.site_name}</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-muted-foreground sm:inline">
            by <a href={s.portfolio} target="_blank" rel="noreferrer" className="font-semibold text-primary">Md. Nafim Muttaki</a>
          </span>
          <Link to="/owner" className="text-muted-foreground hover:text-primary">Owner</Link>
        </div>
      </div>
    </header>
  );
}

export function Socials() {
  const s = useSettings();
  const links = [
    { href: s.portfolio, icon: Globe, label: "Portfolio" },
    { href: s.github, icon: Github, label: "GitHub" },
    { href: s.instagram, icon: Instagram, label: "Instagram" },
    { href: s.facebook, icon: Facebook, label: "Facebook" },
  ];
  return (
    <div className="glass neon-border rounded-2xl p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Creator & Platform Owner</p>
      <h3 className="font-display mt-1 text-2xl font-bold">Md. Nafim Muttaki</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
            <l.icon className="h-4 w-4" />{l.label}
          </a>
        ))}
        <a href={s.donate} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
          <Coffee className="h-4 w-4" />Buy me a coffee
        </a>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8">
        <Socials />
        <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Built & owned by Md. Nafim Muttaki</p>
      </div>
    </footer>
  );
}
