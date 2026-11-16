export type InstallStatus = "unavailable" | "ready" | "prompting" | "accepted" | "dismissed" | "error" | "installed"
export type InstallPromptEvent = Event & {
  prompt: () => Promise<unknown>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function createInstallController() {
  let status: InstallStatus = "unavailable"
  let pending: InstallPromptEvent | null = null
  const listeners = new Set<() => void>()
  const update = (next: InstallStatus) => { status = next; for (const listener of listeners) listener() }
  const isInstalled = () => status === "installed"
  return {
    getSnapshot: () => status,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    capture(event: InstallPromptEvent) {
      if (status === "installed" || status === "prompting") return
      event.preventDefault()
      pending = event
      update("ready")
    },
    installed() { pending = null; update("installed") },
    async install() {
      if (status !== "ready" || !pending) return
      const event = pending
      pending = null // A browser event may be prompted only once.
      update("prompting")
      try {
        await event.prompt()
        const choice = await event.userChoice
        if (!isInstalled()) update(choice.outcome === "accepted" ? "accepted" : "dismissed")
      } catch {
        if (!isInstalled()) update("error")
      }
    },
  }
}
