CREATE TABLE IF NOT EXISTS public."SiteBranding" (
  id text PRIMARY KEY DEFAULT 'home' CHECK (id = 'home'),
  config jsonb NOT NULL CHECK (jsonb_typeof(config) = 'object' AND octet_length(config::text) <= 65536),
  version text NOT NULL CHECK (version ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'),
  "updatedById" text,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public."SiteBrandingChange" (
  id text PRIMARY KEY,
  "brandingId" text NOT NULL DEFAULT 'home' REFERENCES public."SiteBranding"(id) ON DELETE RESTRICT,
  before jsonb,
  after jsonb NOT NULL CHECK (jsonb_typeof(after) = 'object' AND octet_length(after::text) <= 65536),
  "beforeVersion" text,
  "afterVersion" text NOT NULL,
  "actorId" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SiteBrandingChange_brandingId_createdAt_idx" ON public."SiteBrandingChange"("brandingId", "createdAt");
ALTER TABLE public."SiteBranding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SiteBrandingChange" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."SiteBranding", public."SiteBrandingChange" FROM PUBLIC, anon, authenticated;
