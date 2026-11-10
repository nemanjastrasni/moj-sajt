import UiText from "@/app/components/UiText"

export default function LoadingSongs() {
  return <div className="px-4 py-8" role="status" aria-live="polite"><UiText text="Učitavam izvođače i pesme..." /></div>
}
