const ITEMS = [
  "$CREW",
  "No dev. No boss. Just the Crew",
  "Weekly meme contests",
  "Holders vote",
  "Winners paid from a public treasury",
  "Built on Solana",
];

export default function Ticker() {
  // Content is rendered twice so the -50% scroll loops seamlessly
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative z-40 overflow-hidden border-b border-neon/25 bg-background/90">
      <div className="ticker-track flex whitespace-nowrap py-2 font-mono text-[11px] uppercase tracking-[0.28em] text-neon sm:text-xs">
        {row.map((t, i) => (
          <span key={i} className="flex items-center">
            <span className="px-6">{t}</span>
            <span className="text-muted">●</span>
          </span>
        ))}
      </div>
    </div>
  );
}
