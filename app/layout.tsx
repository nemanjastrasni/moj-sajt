import "./globals.css"
import Menu from "@/app/components/Menu"
import BackButton from "@/app/components/BackButton"
import { Poppins } from "next/font/google"
import type { Metadata } from "next"
import Providers from "./providers"

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
    <html lang="en">
      <body className={`${poppins.className} m-0 p-0`}>
        <Providers>

          {/* HEADER */}
          <header className="relative z-[999999] w-full border-b border-gray-800 flex flex-col py-1">
            <Menu />

            {/* Back dugme dole levo */}
            <div className="flex justify-start px-6 pb-1">
              <BackButton />
            </div>
          </header>

          {/* CONTENT */}
          <main className="w-full">
            {children}
          </main>

        </Providers>
      </body>
    </html>
  )
}