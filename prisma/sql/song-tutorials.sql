CREATE TABLE IF NOT EXISTS public."SongTutorial" (
  "songId" text PRIMARY KEY REFERENCES public."Song"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "videoId" text NOT NULL CHECK ("videoId" ~ '^[A-Za-z0-9_-]{11}$'),
  "title" text NOT NULL DEFAULT '' CHECK (length("title") <= 120),
  "version" text NOT NULL CHECK ("version" ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'),
  "updatedById" text NOT NULL,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public."SongTutorial" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."SongTutorial" FROM PUBLIC, anon, authenticated;
