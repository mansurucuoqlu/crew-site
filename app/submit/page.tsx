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
      const message = `CREW submission | Wallet: ${wallet} | Time: ${Date.now()}`;
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

  const statusTone = status.startsWith("❌") ? "text-ruby" : status.startsWith("✅") ? "text-accent" : "text-muted";

  return (
    <main className="page">
      <header className="flex flex-col items-center gap-2 text-center">
        <span className="tag tag-accent"><span className="led" /> Weekly contest</span>
        <h1 className="font-display text-3xl font-extrabold text-white sm:text-5xl">
          Submit your <span className="text-chrome">meme</span>
        </h1>
        <p className="text-muted">One meme per contest. A mod approves it before it shows up.</p>
      </header>

      <div className="panel flex w-full max-w-md flex-col gap-5 p-6">
        <div className="flex justify-center">
          <ConnectButton />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-muted">Image (JPG, PNG or GIF, max 4 MB)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="field text-sm"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-muted">Caption</span>
            <input
              type="text"
              placeholder="Caption (optional)"
              maxLength={200}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="field"
            />
          </label>
          <button type="submit" disabled={loading} className="btn btn-primary mt-2">
            {loading ? "Working..." : "Submit meme"}
          </button>
        </form>

        {status && <p className={`text-center font-semibold ${statusTone}`}>{status}</p>}
      </div>
    </main>
  );
}
