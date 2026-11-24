"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

type Result = { wallet: string; text: string };

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
        if (!cancelled) setResult({ wallet, text });
      })
      .catch(() => {
        if (!cancelled) setResult({ wallet, text: "⚠️ Could not check" });
      });

    return () => {
      cancelled = true;
    };
  }, [wallet]);

  if (!wallet) return null;
  const status = result?.wallet === wallet ? result.text : "Checking...";
  return <p className="text-lg">{status}</p>;
}