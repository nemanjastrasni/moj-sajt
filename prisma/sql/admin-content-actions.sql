CREATE TABLE IF NOT EXISTS public."AdminContentProposal" (
 id text PRIMARY KEY,
 "findingId" text NOT NULL,
 "subjectId" text NOT NULL,
 field text NOT NULL CHECK (field IN ('bio','discography','finding','artist-merge')),
 operation text NOT NULL CHECK (operation IN ('replace','clear','resolve','dismiss','reopen','merge')),
 status text NOT NULL CHECK (status IN ('working','ready','applied','discarded','undone','failed')),
 data jsonb NOT NULL CHECK (jsonb_typeof(data)='object' AND octet_length(data::text)<300000),
 "actorId" text NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AdminContentProposal_finding" ON public."AdminContentProposal" ("findingId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AdminContentProposal_actor" ON public."AdminContentProposal" ("actorId","createdAt" DESC);
CREATE TABLE IF NOT EXISTS public."AdminContentEvent" (
 id text PRIMARY KEY,
 "proposalId" text NOT NULL REFERENCES public."AdminContentProposal"(id) ON DELETE RESTRICT,
 action text NOT NULL CHECK (action IN ('prepared','failed','applied','discarded','undone','resolve','dismiss','reopen','merge')),
 "actorId" text NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("proposalId",action)
);
ALTER TABLE public."AdminContentProposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminContentEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."AdminContentProposal",public."AdminContentEvent" FROM PUBLIC,anon,authenticated;

-- Existing installations also need the new audit values. Preserve every previous
-- predicate, including any additional allowed values, and leave data/RLS intact.
DO $merge_audit$
DECLARE item record; previous text;
BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('AdminContentProposal', 'AdminContentProposal_field_check', 'field', 'artist-merge'),
  ('AdminContentProposal', 'AdminContentProposal_operation_check', 'operation', 'merge'),
  ('AdminContentEvent', 'AdminContentEvent_action_check', 'action', 'merge')
 ) AS entries(table_name, constraint_name, column_name, allowed_value)
 LOOP
  SELECT pg_get_expr(c.conbin,c.conrelid) INTO previous FROM pg_constraint c
   JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
   WHERE t.oid=to_regclass(format('public.%I',item.table_name)) AND c.conname=item.constraint_name AND c.contype='c';
  IF previous IS NULL THEN RAISE EXCEPTION 'Missing audit constraint: %',item.constraint_name; END IF;
  IF position(quote_literal(item.allowed_value) IN previous)=0 THEN
   EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I',item.table_name,item.constraint_name);
   EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK ((%s) OR %I=%L)',item.table_name,item.constraint_name,previous,item.column_name,item.allowed_value);
  END IF;
 END LOOP;
END
$merge_audit$;
