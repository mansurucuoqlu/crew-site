"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (e.g. non-https); nothing else to do
    }
  }

  return (
    <button
      onClick={copy}
      className="px-2 py-1 rounded text-xs bg-gray-800 hover:bg-gray-700"
      aria-label="Copy address"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
