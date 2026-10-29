CREATE TABLE IF NOT EXISTS public."SongPerformer" (
  "songId" text NOT NULL REFERENCES public."Song"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "artistId" text NOT NULL REFERENCES public."Artist"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "position" integer NOT NULL CHECK ("position" BETWEEN 0 AND 5),
  PRIMARY KEY ("songId", "artistId"),
  UNIQUE ("songId", "position")
);
CREATE INDEX IF NOT EXISTS "SongPerformer_artistId_idx" ON public."SongPerformer"("artistId");
ALTER TABLE public."SongPerformer" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."SongPerformer" FROM PUBLIC, anon, authenticated;
