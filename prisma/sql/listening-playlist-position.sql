BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public."ListeningPlaylist" ADD COLUMN IF NOT EXISTS "position" integer;
COMMIT;
