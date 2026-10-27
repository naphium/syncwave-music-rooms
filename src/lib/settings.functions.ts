import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export type SiteSettings = {
  site_name: string; tagline: string; announcement: string; accent_hue: number;
  portfolio: string; github: string; instagram: string; facebook: string; donate: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "SyncWave", tagline: "Listen together. Perfectly in sync.", announcement: "", accent_hue: 190,
  portfolio: "https://nafim.vercel.app", github: "https://github.com/mdnafimmuttaki",
  instagram: "https://www.instagram.com/nafim.exe/", facebook: "https://www.facebook.com/naphium",
  donate: "https://buymeacoffee.com/mdnafimmuttaki",
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data } = await publicClient().from("site_settings").select("*").eq("id", 1).maybeSingle();
    return { ...DEFAULT_SETTINGS, ...(data ?? {}) } as SiteSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
});

/** Server clock for NTP-style sync. */
export const getServerTime = createServerFn({ method: "GET" }).handler(async () => {
  const t1 = Date.now();
  return { t1, t2: Date.now() };
});

const url = z.string().url().max(300);
const schema = z.object({
  passcode: z.string().min(1).max(200),
  settings: z.object({
    site_name: z.string().min(1).max(60), tagline: z.string().max(160), announcement: z.string().max(300),
    accent_hue: z.number().int().min(0).max(360),
    portfolio: url, github: url, instagram: url, facebook: url, donate: url,
  }),
});

export const verifyOwner = createServerFn({ method: "POST" })
  .inputValidator((i: { passcode: string }) => z.object({ passcode: z.string().max(200) }).parse(i))
  .handler(async ({ data }) => {
    const real = process.env["OWNER_PASSCODE"];
    return { ok: !!real && data.passcode === real };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => schema.parse(i))
  .handler(async ({ data }) => {
    const real = process.env["OWNER_PASSCODE"];
    if (!real || data.passcode !== real) throw new Error("Wrong owner passcode");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("site_settings")
      .update({ ...data.settings, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
