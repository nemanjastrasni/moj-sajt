ALTER TABLE public."Favorite"
  ADD COLUMN IF NOT EXISTS "transpose" INTEGER NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Favorite_transpose_range_check'
      AND conrelid = 'public."Favorite"'::regclass
  ) THEN
    ALTER TABLE public."Favorite" ADD CONSTRAINT "Favorite_transpose_range_check"
      CHECK ("transpose" BETWEEN -11 AND 11);
  END IF;
END $$;
