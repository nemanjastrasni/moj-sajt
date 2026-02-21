"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Menu() {
  const [openPesme, setOpenPesme] = useState(false);
  const { data: session } = useSession();

  return (
    <nav className="relative flex justify-between items-start pt-6 pb-6 px-10 bg-red-700 text-black shadow-md overflow-hidden">
      
      {/* LEVA STRANA */}
      <div className="relative z-10 space-y-6">

        <Link href="/" className="string w-64 block">
          <span>Home</span>
        </Link>

        <div>
          <button
            onClick={() => setOpenPesme(!openPesme)}
            className="string w-72 ml-6 text-left"
          >
            <span>Pesme</span>
          </button>

          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              openPesme ? "max-h-40 opacity-100 mt-6" : "max-h-0 opacity-0"
            }`}
          >
            <div className="flex gap-10 ml-16 text-sm">
              <Link href="/pesme/narodne" className="string w-40">
                <span>Narodne</span>
              </Link>
              <Link href="/pesme/domace" className="string w-40">
                <span>Domaće</span>
              </Link>
              <Link href="/pesme/strane" className="string w-40">
                <span>Strane</span>
              </Link>
            </div>
          </div>
        </div>

        <Link href="/plejliste" className="string w-[22rem] ml-12 block">
          <span>Plejliste</span>
        </Link>

        <Link href="/akordi" className="string w-80 ml-20 block">
          <span>Akordi</span>
        </Link>

        <Link href="/biografija" className="string w-96 ml-28 block">
          <span>Biografija</span>
        </Link>

        <Link href="/kontakt" className="string w-[28rem] ml-36 block">
          <span>Kontakt</span>
        </Link>

      </div>

      {/* DESNA STRANA – LOGIN */}
      <div className="relative z-10 flex items-center gap-4">

        {!session ? (
          <button
            onClick={() => signIn("github")}
            className="px-5 py-2 bg-black text-white rounded-lg hover:opacity-80 transition"
          >
            Login with GitHub
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="avatar"
                className="w-10 h-10 rounded-full border"
              />
            )}
            <span className="text-sm font-medium text-red-700">
              {session.user?.name}
            </span>
            <button
              onClick={() => signOut()}
              className="px-3 py-1 bg-gray-200 rounded-md text-sm hover:bg-gray-300 transition"
            >
              Logout
            </button>
          </div>
        )}

      </div>
    </nav>
  );
}