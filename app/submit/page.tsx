"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import ConnectButton from "@/components/ConnectButton";

export default function SubmitPage() {
  const { publicKey, signMessage } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey || !signMessage) {
      setStatus("Connect a wallet first");
      return;
    }
    if (!file) {
      setStatus("Pick an image first");
      return;
    }

    setLoading(true);
    setStatus("Sign the message in your wallet...");

    try {
      const wallet = publicKey.toBase58();
      const message = `CREW submission\nWallet: ${wallet}\nTime: ${Date.now()}`;
      const sig = await signMessage(new TextEncoder().encode(message));

      setStatus("Uploading...");
      const form = new FormData();
      form.append("wallet", wallet);
      form.append("message", message);
      form.append("signature", bs58.encode(sig));
      form.append("caption", caption);
      form.append("file", file);

      const res = await fetch("/api/submit", { method: "POST", body: form });
      const data = await res.json();
      setStatus(data.error ? "❌ " + data.error : "✅ " + data.message);
    } catch {
      setStatus("❌ Signing was cancelled or failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-black text-white p-4">
      <h1 className="text-4xl font-bold">Submit your meme</h1>
      <ConnectButton />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <input
          type="text"
          placeholder="Caption (optional)"
          maxLength={200}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="p-2 rounded bg-gray-900 border border-gray-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="p-3 rounded bg-purple-600 font-bold disabled:opacity-50"
        >
          {loading ? "Working..." : "Submit meme"}
        </button>
      </form>

      {status && <p className="text-center">{status}</p>}
    </main>
  );
}