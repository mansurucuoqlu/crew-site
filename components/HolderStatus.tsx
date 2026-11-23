"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export default function HolderStatus() {
  const { publicKey } = useWallet();
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (!publicKey) {
      setStatus("");
      return;
    }

    setStatus("Checking...");

    fetch("/api/check-holder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: publicKey.toBase58() }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setStatus("⚠️ Error: " + data.error);
        else if (data.note) setStatus("⏳ " + data.note);
        else if (data.holder) setStatus(`✅ Crew member — you hold ${data.balance}`);
        else setStatus("❌ Not a holder yet");
      })
      .catch(() => setStatus("⚠️ Could not check"));
  }, [publicKey]);

  if (!status) return null;
  return <p className="text-lg">{status}</p>;
}