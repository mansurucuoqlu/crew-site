"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import ConnectButton from "@/components/ConnectButton";

type Submission = {
  id: number;
  image_url: string;
  caption: string | null;
  wallet: string;
  created_at: string;
};

type Auth = { wallet: string; message: string; signature: string };

function shortWallet(w: string) {
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

export default function ModPage() {
  const { publicKey, signMessage } = useWallet();
  const [signedIn, setAuth] = useState<Auth | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  // A sign-in only counts for the wallet that is still connected
  const currentWallet = publicKey?.toBase58() ?? null;
  const auth = signedIn?.wallet === currentWallet ? signedIn : null;

  async function callApi(a: Auth, body: Record<string, unknown>) {
    const res = await fetch("/api/mod", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, ...body }),
    });
    const data = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
    if (data.error) {
      if (data.error === "Sign in again") {
        setAuth(null);
        setSubmissions([]);
      }
      throw new Error(data.error);
    }
    return data;
  }

  async function loadPending(a: Auth) {
    setLoading(true);
    setError("");
    try {
      const data = await callApi(a, { action: "list" });
      setSubmissions(data.submissions ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function signIn() {
    if (!publicKey || !signMessage) {
      setError("Connect a wallet that supports message signing first");
      return;
    }
    setError("");
    try {
      const wallet = publicKey.toBase58();
      const message = `CREW mod | Wallet: ${wallet} | Time: ${Date.now()}`;
      const sig = await signMessage(new TextEncoder().encode(message));
      const a = { wallet, message, signature: bs58.encode(sig) };
      setAuth(a);
      await loadPending(a);
    } catch {
      setError("Signing was cancelled or failed");
    }
  }

  async function moderate(id: number, action: "approve" | "reject") {
    if (!auth) return;
    setBusyId(id);
    setError("");
    try {
      await callApi(auth, { action, submissionId: id });
      setSubmissions((list) => list.filter((s) => s.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 bg-black text-white p-4">
      <h1 className="text-4xl font-bold mt-8">Mod queue</h1>
      <ConnectButton />

      {!auth ? (
        <button
          onClick={signIn}
          disabled={!publicKey}
          className="p-3 rounded bg-purple-600 font-bold disabled:opacity-50"
        >
          Sign in as mod
        </button>
      ) : (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">Signed in as {shortWallet(auth.wallet)}</span>
          <button
            onClick={() => loadPending(auth)}
            disabled={loading}
            className="px-4 py-2 rounded bg-purple-600 font-bold disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      )}

      {error && <p className="text-red-400">❌ {error}</p>}

      {auth && !loading && submissions.length === 0 && !error && (
        <p className="text-gray-400">No pending memes 🎉</p>
      )}

      <div className="grid gap-6 w-full max-w-4xl sm:grid-cols-2 lg:grid-cols-3">
        {submissions.map((s) => (
          <div key={s.id} className="flex flex-col rounded border border-gray-800 bg-gray-900 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.image_url} alt={s.caption || "Meme submission"} className="w-full aspect-square object-contain bg-black" />
            <div className="flex flex-col gap-2 p-3 flex-1">
              {s.caption && <p className="break-words">{s.caption}</p>}
              <p className="text-xs text-gray-500">
                {shortWallet(s.wallet)} · {new Date(s.created_at).toLocaleString()}
              </p>
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => moderate(s.id, "approve")}
                  disabled={busyId === s.id}
                  className="flex-1 p-2 rounded bg-purple-600 font-bold disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => moderate(s.id, "reject")}
                  disabled={busyId === s.id}
                  className="flex-1 p-2 rounded bg-gray-700 font-bold disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
