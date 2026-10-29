-- Additive setup for Supabase SQL Editor. Existing songs/users are not changed.
BEGIN;
CREATE TABLE IF NOT EXISTS public."SongSubmission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "artistName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "lyrics" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewNote" TEXT,
  "reviewerId" TEXT,
  "publishedSongId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "SongSubmission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SongSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SongSubmission_publishedSongId_fkey" FOREIGN KEY ("publishedSongId") REFERENCES public."Song"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SongSubmission_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected')),
  CONSTRAINT "SongSubmission_category_check" CHECK ("category" IN ('domace', 'narodne', 'strane'))
);
CREATE INDEX IF NOT EXISTS "SongSubmission_userId_createdAt_idx" ON public."SongSubmission"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SongSubmission_status_createdAt_idx" ON public."SongSubmission"("status", "createdAt");
-- No public REST policies: proposals are accessible only through the trusted server.
ALTER TABLE public."SongSubmission" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."SongSubmission" FROM PUBLIC, anon, authenticated;
COMMIT;
