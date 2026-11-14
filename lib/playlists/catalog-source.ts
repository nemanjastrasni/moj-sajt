import { Prisma } from "@prisma/client"

// PostgreSQL computes the same fingerprint for the generator and live reads.
// JSON preserves the distinction between NULL, empty strings and field boundaries.
export const catalogSourceHash = Prisma.sql`encode(sha256(convert_to(jsonb_build_array(s.lyrics, s.chords)::text, 'UTF8')), 'hex')`
