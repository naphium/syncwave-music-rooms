CREATE TABLE public.site_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name text NOT NULL DEFAULT 'SyncWave',
  tagline text NOT NULL DEFAULT 'Listen together. Perfectly in sync.',
  announcement text NOT NULL DEFAULT '',
  accent_hue int NOT NULL DEFAULT 190,
  portfolio text NOT NULL DEFAULT 'https://nafim.vercel.app',
  github text NOT NULL DEFAULT 'https://github.com/mdnafimmuttaki',
  instagram text NOT NULL DEFAULT 'https://www.instagram.com/nafim.exe/',
  facebook text NOT NULL DEFAULT 'https://www.facebook.com/naphium',
  donate text NOT NULL DEFAULT 'https://buymeacoffee.com/mdnafimmuttaki',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.site_settings (id) VALUES (1);