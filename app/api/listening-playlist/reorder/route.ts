import { prisma } from "@/lib/prisma"

export async function PUT(req: Request) {
  const { playlistId, items } = await req.json()

  await Promise.all(
    items.map((id: string, index: number) =>
      prisma.listeningItem.update({
        where: { id },
        data: { order: index },
      })
    )
  )

  return Response.json({ ok: true })
}