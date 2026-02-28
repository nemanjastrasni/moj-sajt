export const runtime = "nodejs"

import { exec } from "child_process"
import { NextResponse } from "next/server"

export async function GET() {
  return new Promise((resolve) => {
    exec("npx prisma db push --accept-data-loss", (error, stdout, stderr) => {
      if (error) {
        resolve(NextResponse.json({ error: stderr }))
      } else {
        resolve(NextResponse.json({ success: stdout }))
      }
    })
  })
}