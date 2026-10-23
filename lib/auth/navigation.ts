export function safeCallbackUrl(value: string | null | undefined, origin: string): string {
  if (!value) return "/"
  try {
    const url = new URL(value, origin)
    if (url.origin !== origin || url.username || url.password) return "/"
    if (/^\/(?:login|signup|signin)(?:\/|$)/i.test(url.pathname) || /^\/api\/auth(?:\/|$)/i.test(url.pathname)) return "/"
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return "/"
  }
}

export function authErrorMessage(code?: string | null): string {
  switch (code) {
    case "CredentialsSignin": return "Email ili lozinka nisu ispravni."
    case "OAuthAccountNotLinked": return "Za ovaj email vec postoji nalog. Prijavi se emailom i lozinkom."
    case "AccessDenied": return "Prijava nije dozvoljena. Proveri da li je Google email potvrdjen ili se obrati administratoru."
    case "Configuration": return "Prijava trenutno nije dostupna. Obrati se administratoru."
    case "ServiceUnavailable": return "Prijava trenutno nije dostupna. Pokusaj malo kasnije."
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthCreateAccount": return "Google prijava nije uspela. Pokusaj ponovo ili se prijavi emailom."
    case "SessionRequired": return "Prijavi se da nastavis."
    default: return "Prijava nije uspela. Pokusaj ponovo."
  }
}

export async function withAuthTimeout<T>(operation: Promise<T>, milliseconds = 20000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("AUTH_TIMEOUT")), milliseconds)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
