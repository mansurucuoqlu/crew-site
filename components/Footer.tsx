// Placeholder links: swap in the real URLs when the accounts exist
export const SOCIALS = [
  {
    label: "X",
    href: "#",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-6.3L6.4 22H3.3l7.3-8.3L1 2h6.3l4.4 5.8L18.9 2zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20z" />
      </svg>
    ),
  },
  {
    label: "Telegram",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.1 1.8 11.6c-1-.3-1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3z" />
      </svg>
    ),
  },
  {
    label: "pump.fun",
    href: "#",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-35 12 12)" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-16 border-t border-line bg-background/80">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-10 sm:px-6 md:flex-row md:justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/coin.svg" alt="" className="h-9 w-9 rounded-full ring-2 ring-neon/70" />
          <div className="leading-none">
            <p className="font-display text-sm font-extrabold tracking-[0.22em] text-white">CREW</p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.32em] text-neon">NO DEV · NO BOSS</p>
          </div>
        </div>
        <div className="flex gap-3">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
              {s.icon}
              {s.label}
            </a>
          ))}
        </div>
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          Not financial advice. Memecoins are risky.
        </p>
      </div>
    </footer>
  );
}
