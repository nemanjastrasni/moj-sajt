CREATE TABLE IF NOT EXISTS public."FavoritePlaylist" (
  "userId" text PRIMARY KEY REFERENCES public."User"(id) ON DELETE CASCADE,
  "playlistId" text UNIQUE REFERENCES public."Playlist"(id) ON DELETE SET NULL,
  "migratedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceHash" text NOT NULL DEFAULT ''
);
ALTER TABLE public."FavoritePlaylist" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."FavoritePlaylist" FROM PUBLIC, anon, authenticated;
