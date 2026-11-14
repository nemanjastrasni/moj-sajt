-- Additive optional setup. Run outside a transaction, through setup-home-indexes.cjs.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Song_home_popular_idx"
ON public."Song" (popularity DESC, id ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Song_home_latest_idx"
ON public."Song" ("createdAt" DESC NULLS LAST, id DESC);
