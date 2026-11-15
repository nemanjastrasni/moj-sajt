import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { SubmissionError } from "@/lib/submissions/validation"
import * as core from "@/scripts/lib/artist-merge.cjs"

const adapter = (tx: Prisma.TransactionClient): core.Database => ({ query: async (sql, params = []) => {
  if (/^\s*SELECT/i.test(sql)) { const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params); return { rows } }
  await tx.$executeRawUnsafe(sql, ...params); return { rows: [] }
} })
export async function mergeArtists(actorId: string, data: unknown) {
  try {
    const input = core.validate(data)
    for (let attempt = 0; ; attempt++) {
      try {
        return await prisma.$transaction(async tx => {
          const db = adapter(tx)
          if (input.action === "preview") return { preview: core.preview(core.plan(await core.load(db, input), input)) }
          return { result: await core.apply(db, actorId, input) }
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 })
      } catch (error) {
        if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue
        throw error
      }
    }
  } catch (error) {
    if (error instanceof core.MergeError) throw new SubmissionError(error.status, error.message)
    throw error
  }
}
