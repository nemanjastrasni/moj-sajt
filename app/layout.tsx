import "./globals.css"
import "./theme.css"
import Menu from "@/app/components/Menu"
import BackButton from "@/app/components/BackButton"
import { Poppins } from "next/font/google"
import type { Metadata } from "next"
import Providers from "./providers"
import ThemeToggle from "@/app/components/ThemeToggle"
import { THEME_INIT_SCRIPT } from "@/lib/theme"
import LanguageSelect from "@/app/components/LanguageSelect"
import { LOCALE_INIT_SCRIPT } from "@/lib/i18n"
import UiText from "@/app/components/UiText"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
})



export const metadata: Metadata = {
  metadataBase: new URL("https://gitarakordi.com"),
  title: {
    default: "GitaraAkordi – Akordi i tekstovi pesama",
    template: "%s | GitaraAkordi",
  },
  description:
    "GitaraAkordi – najveća kolekcija akorda, tekstova pesama, biografija i diskografija izvođača.",
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sr-Latn" data-theme="dark" data-language="sr" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT + ";" + LOCALE_INIT_SCRIPT }} /></head>
      <body className={`${poppins.className} m-0 p-0 overflow-x-hidden`}>
        <Providers>

          {/* HEADER */}
          <header className="relative z-[999999] w-full border-b border-gray-800 flex flex-col py-1">
            <Menu />

            {/* Back dugme dole levo */}
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-3 px-3 pb-1 sm:px-6">
              <BackButton />
              <div className="ml-auto flex items-center gap-1"><ThemeToggle /><LanguageSelect /></div>
            </div>
          </header>

          {/* CONTENT */}
          <main className="w-full max-w-6xl mx-auto px-4 pb-24">
            {children}
          </main>

          <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-gray-400">
            <a href="/kontakt" className="underline underline-offset-2"><UiText text="Kontakt" /></a>
            {" · "}<a href="/prijava-povrede" className="underline underline-offset-2"><UiText text="Prijava povrede prava" /></a>
            {" · "}
            <a href="/foto-izvori" className="underline underline-offset-2">Fotografije / Photo Credits</a>
            {" · "}<a href="/wiki-izvori" className="underline underline-offset-2">Wikipedia / Sources</a>
          </footer>

        </Providers>
      </body>
    </html>
  )
}
