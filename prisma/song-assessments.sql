-- Additive, idempotent setup. Run through scripts/song-assessments.cjs --apply.
-- No default/table rewrite; short lock timeout prevents waiting behind live work.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
ALTER TABLE public."Song" ADD COLUMN IF NOT EXISTS "musicAssessment" jsonb;

CREATE OR REPLACE FUNCTION public.song_assessment_hash(lyrics text, chords text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = pg_catalog AS $$
  SELECT encode(sha256(convert_to(coalesce(lyrics,''),'UTF8') || decode('00','hex') ||
    CASE WHEN chords IS NULL THEN decode('00','hex') ELSE decode('01','hex') || convert_to(chords,'UTF8') END),'hex')
$$;

CREATE OR REPLACE FUNCTION public.guard_song_assessment()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.lyrics IS NOT DISTINCT FROM OLD.lyrics AND NEW.chords IS NOT DISTINCT FROM OLD.chords
       AND NEW."musicAssessment" IS NOT DISTINCT FROM OLD."musicAssessment" THEN RETURN NEW; END IF;
  END IF;
  IF NEW."musicAssessment" IS NULL THEN RETURN NEW; END IF;
  IF jsonb_typeof(NEW."musicAssessment") IS DISTINCT FROM 'object'
     OR jsonb_typeof(NEW."musicAssessment"->'version') IS DISTINCT FROM 'string'
     OR (NEW."musicAssessment"->>'version') !~ '^[a-f0-9]{64}$'
     OR jsonb_typeof(NEW."musicAssessment"->'sourceHash') IS DISTINCT FROM 'string'
     OR (NEW."musicAssessment"->>'sourceHash') !~ '^[a-f0-9]{64}$'
     OR jsonb_typeof(NEW."musicAssessment"->'chords') IS DISTINCT FROM 'array'
     OR NOT (NEW."musicAssessment" ? 'level') THEN
    RAISE EXCEPTION 'Invalid music assessment' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW."musicAssessment"->'chords') chord WHERE jsonb_typeof(chord) <> 'string')
     OR NOT (NEW."musicAssessment"->'level' = 'null'::jsonb OR NEW."musicAssessment"->>'level' IN ('very_easy','easy','medium','hard','very_hard'))
     OR ((NEW."musicAssessment"->'level' = 'null'::jsonb) <> (jsonb_array_length(NEW."musicAssessment"->'chords') = 0)) THEN
    RAISE EXCEPTION 'Invalid music assessment' USING ERRCODE = '23514';
  END IF;
  IF NEW."musicAssessment"->>'sourceHash' IS DISTINCT FROM public.song_assessment_hash(NEW.lyrics,NEW.chords) THEN
    NEW."musicAssessment" := NULL;
  END IF;
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS song_assessment_guard ON public."Song";
CREATE TRIGGER song_assessment_guard BEFORE INSERT OR UPDATE OF lyrics,chords,"musicAssessment"
  ON public."Song" FOR EACH ROW EXECUTE FUNCTION public.guard_song_assessment();
