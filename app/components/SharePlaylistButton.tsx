"use client"

export default function SharePlaylistButton() {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(window.location.href)
        alert("Link kopiran!")
      }}
      className="text-sm text-blue-400 hover:text-blue-300"
    >
      🔗 Share
    </button>
  )
}