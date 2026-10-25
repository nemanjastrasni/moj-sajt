-- Additive and idempotent. Existing songs and their musical content are not changed.
CREATE TABLE IF NOT EXISTS public."SongReview" (
  "songId" TEXT NOT NULL PRIMARY KEY,
  "status" TEXT NOT NULL DEFAULT 'unreviewed',
  "reviewedById" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SongReview_songId_fkey" FOREIGN KEY ("songId") REFERENCES public."Song"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SongReview_status_check" CHECK ("status" IN ('unreviewed', 'needs_fix', 'verified'))
);
CREATE INDEX IF NOT EXISTS "SongReview_status_idx" ON public."SongReview"("status");
-- Review metadata is server/admin-only, never available through public REST policies.
ALTER TABLE public."SongReview" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reset_song_review_on_content_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD."lyrics" IS DISTINCT FROM NEW."lyrics" OR OLD."chords" IS DISTINCT FROM NEW."chords" THEN
    DELETE FROM public."SongReview" WHERE "songId" = NEW."id";
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS "Song_review_content_reset" ON public."Song";
CREATE TRIGGER "Song_review_content_reset"
AFTER UPDATE OF "lyrics", "chords" ON public."Song"
FOR EACH ROW EXECUTE FUNCTION public.reset_song_review_on_content_change();
