CREATE TABLE IF NOT EXISTS public."PlaylistSongSetting" (
  "playlistSongId" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "transpose" INTEGER NOT NULL DEFAULT 0,
  "capo" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaylistSongSetting_playlistSongId_fkey" FOREIGN KEY ("playlistSongId") REFERENCES public."PlaylistSong"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlaylistSongSetting_transpose_check" CHECK ("transpose" BETWEEN -11 AND 11),
  CONSTRAINT "PlaylistSongSetting_capo_check" CHECK ("capo" IS NULL OR "capo" BETWEEN 0 AND 12),
  CONSTRAINT "PlaylistSongSetting_version_check" CHECK ("version" >= 1)
);
CREATE INDEX IF NOT EXISTS "PlaylistSongSetting_userId_idx" ON public."PlaylistSongSetting"("userId");
ALTER TABLE public."PlaylistSongSetting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."PlaylistSongSetting" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE public."PlaylistSongSetting" FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE public."PlaylistSongSetting" FROM authenticated; END IF;
END $$;
