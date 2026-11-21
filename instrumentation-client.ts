import { NAVIGATION_STARTED } from "./lib/navigation/feedback"

export function onRouterTransitionStart(url: string) {
  window.dispatchEvent(new CustomEvent(NAVIGATION_STARTED, { detail: url }))
}
