"use client";

import { useState } from "react";
import { shortAddr } from "@/lib/format";

// "CA  Gg4H…pump  COPY" chip for the token contract address
export default function CaChip({ label = "CA", value }: { label?: string; value: string | null }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked; nothing else to do
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!value}
      className="clip-md flex items-center gap-3 bg-background/70 px-4 py-3 text-left shadow-[inset_0_0_0_1px_rgba(132,212,11,0.35)] transition hover:shadow-[inset_0_0_0_1px_rgba(132,212,11,0.8)] disabled:cursor-default"
    >
      <span className="font-mono text-[10px] tracking-[0.3em] text-neon">{label}</span>
      <span className="font-mono text-sm tracking-wider text-white sm:text-base">
        {value ? shortAddr(value, 6) : "Launching soon"}
      </span>
      {value && (
        <span className="ml-auto font-display text-[10px] uppercase tracking-[0.2em] text-muted">
          {copied ? "Copied" : "Copy"}
        </span>
      )}
    </button>
  );
}
