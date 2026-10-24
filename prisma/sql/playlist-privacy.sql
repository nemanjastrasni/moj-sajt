-- Run before deploying the playlist privacy feature. No songs or lists are deleted.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Playlist' AND column_name = 'isPublic'
  ) THEN
    ALTER TABLE public."Playlist" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT FALSE;
    -- Existing curated admin lists keep their public status; personal lists start private.
    UPDATE public."Playlist" SET "isPublic" = TRUE WHERE "isAdmin" = TRUE;
  END IF;
END $$;
