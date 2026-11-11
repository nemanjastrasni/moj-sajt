-- Run as separate statements, outside a transaction. Existing primary/unique indexes stay intact.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Song_search_title_trgm_idx" ON public."Song" USING gin ((replace(regexp_replace(normalize(lower(title), NFD), '[̀-ͯ]', '', 'g'), 'đ', 'dj')) extensions.gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Song_search_slug_trgm_idx" ON public."Song" USING gin (slug extensions.gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Artist_search_name_trgm_idx" ON public."Artist" USING gin ((replace(regexp_replace(normalize(lower(name), NFD), '[̀-ͯ]', '', 'g'), 'đ', 'dj')) extensions.gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Artist_search_slug_trgm_idx" ON public."Artist" USING gin (slug extensions.gin_trgm_ops);
