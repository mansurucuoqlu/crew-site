"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ConnectButton";
import { SOCIALS } from "@/components/Footer";

const LINKS = [
  { href: "/contest", label: "Contest" },
  { href: "/submit", label: "Submit" },
  { href: "/treasury", label: "Treasury" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/coin.svg" alt="" className="h-10 w-10 rounded-full ring-2 ring-neon/80 transition group-hover:ring-lime" />
          <span className="leading-none">
            <span className="block font-display text-sm font-extrabold tracking-[0.22em] text-white">CREW</span>
            <span className="mt-1 block font-mono text-[10px] tracking-[0.32em] text-neon">$CREW</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 font-display text-[11px] uppercase tracking-[0.28em] md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`transition hover:text-neon ${pathname === l.href ? "text-neon" : "text-mist/80"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {SOCIALS.slice(0, 2).map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="hidden h-9 w-9 place-items-center rounded-full bg-black text-mist ring-1 ring-white/10 transition hover:text-neon hover:ring-neon sm:grid"
            >
              {s.icon}
            </a>
          ))}
          <div className="nav-wallet">
            <ConnectButton />
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center text-neon shadow-[inset_0_0_0_1px_rgba(132,212,11,0.4)] md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M3 3l12 12M15 3L3 15" /> : <path d="M2 4h14M2 9h14M2 14h14" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-background/95 px-4 py-4 font-display text-xs uppercase tracking-[0.28em] md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block py-3 hover:text-neon ${pathname === l.href ? "text-neon" : "text-mist"}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
