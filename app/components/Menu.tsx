"use client";

import { useState } from "react";

export default function Menu() {
  const [openPesme, setOpenPesme] = useState(false);

  return (
    <nav className="pt-1 pb-10 px-10 space-y-8 select-none">


      <a href="/" className="string w-64">
        <span>Home</span>
      </a>

      <div>
        <button
          onClick={() => setOpenPesme(!openPesme)}
          className="string w-72 ml-6 text-left"
        >
          <span>Pesme</span>
        </button>

        {/* Klizeći podmeni */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            openPesme ? "max-h-40 opacity-100 mt-6" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex gap-10 ml-16 text-sm">
            <a href="/pesme/narodne" className="string w-40">
              <span>Narodne</span>
            </a>
            <a href="/pesme/domace" className="string w-40">
              <span>Domaće</span>
            </a>
            <a href="/pesme/strane" className="string w-40">
              <span>Strane</span>
            </a>
          </div>
        </div>
      </div>

      <a href="/plejliste" className="string w-[22rem] ml-12">
        <span>Plejliste</span>
      </a>

      <a href="/akordi" className="string w-80 ml-20">
        <span>Akordi</span>
      </a>

      <a href="/about" className="string w-96 ml-28">
        <span>O sajtu</span>
      </a>

      <a href="/kontakt" className="string w-[28rem] ml-36">
        <span>Kontakt</span>
      </a>

    </nav>
  );
}

