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
    <main className="page">
      <header className="flex flex-col items-center gap-2 text-center">
        <span className="tag tag-red"><span className="led" /> Mods only</span>
        <h1 className="font-display text-3xl font-extrabold text-white sm:text-5xl">
          Mod <span className="text-chrome">queue</span>
        </h1>
      </header>

      <div className="panel flex w-full max-w-md flex-col items-center gap-4 p-6">
        <ConnectButton />
        {!auth ? (
          <button onClick={signIn} disabled={!publicKey} className="btn btn-primary">
            Sign in as mod
          </button>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="chip">Signed in as {shortWallet(auth.wallet)}</span>
            <button onClick={() => loadPending(auth)} disabled={loading} className="btn btn-ghost btn-sm">
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        )}
        {error && <p className="font-semibold text-ruby">❌ {error}</p>}
      </div>

      {auth && !loading && submissions.length === 0 && !error && (
        <div className="panel flex w-full max-w-md flex-col items-center gap-2 p-8 text-center">
          <p className="font-display text-3xl text-accent">All clear</p>
          <p className="text-muted">No pending memes 🎉</p>
        </div>
      )}

      <div className="grid w-full gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {submissions.map((s) => (
          <div key={s.id} className="panel flex flex-col overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.image_url} alt={s.caption || "Meme submission"} className="aspect-square w-full bg-black object-contain" />
            <div className="flex flex-1 flex-col gap-3 p-4">
              {s.caption && <p className="break-words">{s.caption}</p>}
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="chip">{shortWallet(s.wallet)}</span>
                {new Date(s.created_at).toLocaleString()}
              </p>
              <div className="mt-auto flex gap-3">
                <button
                  onClick={() => moderate(s.id, "approve")}
                  disabled={busyId === s.id}
                  className="btn btn-primary flex-1"
                >
                  Approve
                </button>
                <button
                  onClick={() => moderate(s.id, "reject")}
                  disabled={busyId === s.id}
                  className="btn btn-danger flex-1"
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
