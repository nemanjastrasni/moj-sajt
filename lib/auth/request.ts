export class RequestBodyError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export async function readLimitedJson(request: Request, limit: number): Promise<unknown> {
  const length = Number(request.headers.get("content-length"))
  if (length > limit) throw new RequestBodyError(413, "Podaci su preveliki. Smanji profilnu sliku.")
  const reader = request.body?.getReader()
  if (!reader) throw new RequestBodyError(400, "Nedostaju podaci za registraciju.")
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new RequestBodyError(413, "Podaci su preveliki. Smanji profilnu sliku.")
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new RequestBodyError(400, "Neispravni podaci za registraciju.")
  }
}
