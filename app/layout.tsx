import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Menu from "./Menu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Moj Muzički Sajt",
  description: "Tekstovi pesama, akordi i plejliste",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sr">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Menu />
        <main className="p-6">
          {children}
        </main>
      </body>
    </html>
  );
}



