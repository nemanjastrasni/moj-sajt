-- Additive, idempotent setup. Run as the trusted application/database owner.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS public."EngagementConfig" (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  "startedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version integer NOT NULL DEFAULT 1 CHECK (version = 1)
);
INSERT INTO public."EngagementConfig" (id) VALUES (true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public."EngagementConsent" (
  "userId" text PRIMARY KEY REFERENCES public."User"(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstDay" date
);
CREATE TABLE IF NOT EXISTS public."EngagementDaily" (
  "userId" text NOT NULL REFERENCES public."EngagementConsent"("userId") ON DELETE CASCADE,
  day date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  playlist_song boolean NOT NULL DEFAULT false,
  performance boolean NOT NULL DEFAULT false,
  music_play boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("userId", day)
);
CREATE INDEX IF NOT EXISTS "EngagementDaily_day" ON public."EngagementDaily" (day);
ALTER TABLE public."EngagementConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EngagementConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EngagementDaily" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."EngagementConfig", public."EngagementConsent", public."EngagementDaily" FROM PUBLIC;
DO $block$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON public."EngagementConfig", public."EngagementConsent", public."EngagementDaily" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON public."EngagementConfig", public."EngagementConsent", public."EngagementDaily" FROM authenticated;
  END IF;
END $block$;
COMMIT;
