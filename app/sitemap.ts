export const dynamic = "force-dynamic"

export async function GET() {
  return new Response("", {
    headers: {
      "Content-Type": "application/xml",
    },
  })
}