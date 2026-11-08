CREATE TABLE IF NOT EXISTS public."AdminContentProposal" (
 id text PRIMARY KEY,
 "findingId" text NOT NULL,
 "subjectId" text NOT NULL,
 field text NOT NULL CHECK (field IN ('bio','discography','finding')),
 operation text NOT NULL CHECK (operation IN ('replace','clear','resolve','dismiss','reopen')),
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
 action text NOT NULL CHECK (action IN ('prepared','failed','applied','discarded','undone','resolve','dismiss','reopen')),
 "actorId" text NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("proposalId",action)
);
ALTER TABLE public."AdminContentProposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminContentEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."AdminContentProposal",public."AdminContentEvent" FROM PUBLIC,anon,authenticated;
