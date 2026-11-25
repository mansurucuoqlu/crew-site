"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

type Result = { wallet: string; text: string; holder?: boolean };

export default function HolderStatus() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;

    fetch("/api/check-holder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    })
      .then((res) => res.json())
      .then((data) => {
        let text = "❌ Not a holder yet";
        if (data.error) text = "⚠️ Error: " + data.error;
        else if (data.note) text = "⏳ " + data.note;
        else if (data.holder) text = `✅ Crew member — you hold ${data.balance}`;
        if (!cancelled) setResult({ wallet, text, holder: !data.error && !data.note && !!data.holder });
      })
      .catch(() => {
        if (!cancelled) setResult({ wallet, text: "⚠️ Could not check" });
      });

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  if (!wallet) return null;
  const current = result?.wallet === wallet ? result : null;
  if (current?.holder) {
    return <p className="tag tag-accent text-sm! normal-case! tracking-normal!">{current.text}</p>;
  }
  return <p className="chip text-sm!">{current?.text ?? "Checking..."}</p>;
}