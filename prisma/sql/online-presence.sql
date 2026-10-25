CREATE TABLE IF NOT EXISTS public.online_presence (
  visitor_id TEXT PRIMARY KEY,
  user_id TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  country_code TEXT
);
ALTER TABLE public.online_presence ADD COLUMN IF NOT EXISTS country_code TEXT;
CREATE INDEX IF NOT EXISTS online_presence_last_seen_idx ON public.online_presence (last_seen);
