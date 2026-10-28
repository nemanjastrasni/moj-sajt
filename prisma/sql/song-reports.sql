-- Additive setup. Run inside a transaction; setup-song-reports.cjs does this.
CREATE TABLE IF NOT EXISTS public."SongReport" (
  "id" TEXT NOT NULL,
  "songId" TEXT,
  "userId" TEXT,
  "kind" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "songTitle" TEXT NOT NULL,
  "artistName" TEXT NOT NULL,
  "songVersion" TEXT NOT NULL,
  "transpose" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewNote" TEXT,
  "reviewerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "SongReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SongReport_songId_fkey" FOREIGN KEY ("songId") REFERENCES public."Song"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SongReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SongReport_kind_check" CHECK ("kind" IN ('wrong_chord', 'layout', 'lyrics', 'duplicate')),
  CONSTRAINT "SongReport_status_check" CHECK ("status" IN ('pending', 'resolved', 'dismissed')),
  CONSTRAINT "SongReport_description_check" CHECK (char_length(btrim("description")) BETWEEN 10 AND 2000),
  CONSTRAINT "SongReport_note_check" CHECK ("reviewNote" IS NULL OR char_length("reviewNote") <= 1000),
  CONSTRAINT "SongReport_version_check" CHECK ("songVersion" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "SongReport_transpose_check" CHECK ("transpose" BETWEEN -11 AND 11)
);
CREATE INDEX IF NOT EXISTS "SongReport_status_createdAt_idx" ON public."SongReport"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SongReport_userId_createdAt_idx" ON public."SongReport"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "SongReport_songId_idx" ON public."SongReport"("songId");
CREATE UNIQUE INDEX IF NOT EXISTS "SongReport_pending_unique" ON public."SongReport"("userId", "songId", "kind") WHERE "status" = 'pending' AND "userId" IS NOT NULL AND "songId" IS NOT NULL;
ALTER TABLE public."SongReport" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."SongReport" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE public."SongReport" FROM anon; END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE public."SongReport" FROM authenticated; END IF;
END $$;
