import "./globals.css"
import Menu from "@/app/components/Menu"
import { Poppins } from "next/font/google"
import type { Metadata } from "next"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
})

export const metadata: Metadata = {
  title: "Moj Sajt",
  description: "Akordi i tekstovi",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${poppins.className} m-0 p-0`}>
        
        {/* HEADER */}
        <header className="w-full">
          <Menu />
        </header>

        {/* CONTENT */}
        <main className="w-full">
          {children}
        </main>

      </body>
    </html>
  )
}
