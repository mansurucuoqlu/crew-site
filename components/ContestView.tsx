"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import ConnectButton from "@/components/ConnectButton";

export type Contest = {
  id: number;
  theme: string;
  starts_at: string;
  submit_ends: string;
  vote_ends: string;
  prize_amount: number;
  winner_id: number | null;
};

export type Meme = {
  id: number;
  wallet: string;
  image_url: string;
  caption: string | null;
  votes: number;
};

type Phase = "submitting" | "voting" | "ended";

function shortWallet(w: string) {
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

function voteMessage(wallet: string, id: number) {
  return `CREW vote | Wallet: ${wallet} | Submission: ${id} | Time: ${Date.now()}`;
}

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d > 0 ? `${d}d ` : ""}${h}h ${m}m ${sec}s`;
}

export default function ContestView({
  contest,
  memes,
  serverNow,
}: {
  contest: Contest;
  memes: Meme[];
  serverNow: number;
}) {
  const router = useRouter();
  const { publicKey, signMessage } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;

  // Start from the server's clock so the first render matches, then tick
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const submitEnds = Date.parse(contest.submit_ends);
  const voteEnds = Date.parse(contest.vote_ends);
  const phase: Phase = now < submitEnds ? "submitting" : now < voteEnds ? "voting" : "ended";

  // Reload server data when the phase flips (e.g. voting just opened)
  const lastPhase = useRef(phase);
  useEffect(() => {
    if (lastPhase.current !== phase) {
      lastPhase.current = phase;
      router.refresh();
    }
  }, [phase, router]);

  // Which meme did this wallet vote for?
  const [votedFor, setVotedFor] = useState<{ wallet: string; id: number | null } | null>(null);
  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    fetch(`/api/vote?contestId=${contest.id}&wallet=${wallet}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && !d.error) setVotedFor({ wallet, id: d.submissionId });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [wallet, contest.id]);
  const myVote = votedFor && votedFor.wallet === wallet ? votedFor.id : null;

  const [busyId, setBusyId] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  async function vote(id: number) {
    if (!wallet || !signMessage) {
      setStatus("❌ Connect a wallet first");
      return;
    }
    setBusyId(id);
    setStatus("Sign the vote in your wallet...");
    try {
      const message = voteMessage(wallet, id);
      const sig = await signMessage(new TextEncoder().encode(message));
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, message, signature: bs58.encode(sig), submissionId: id }),
      });
      const data = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
      if (data.error) {
        setStatus("❌ " + data.error);
      } else {
        setVotedFor({ wallet, id });
        setStatus("✅ Vote counted!");
        router.refresh();
      }
    } catch {
      setStatus("❌ Signing was cancelled or failed");
    } finally {
      setBusyId(null);
    }
  }

  // Results: most votes first. Winner is the one set in the DB, else the top vote-getter(s)
  const shown = phase === "ended" ? [...memes].sort((a, b) => b.votes - a.votes) : memes;
  const topVotes = Math.max(0, ...memes.map((m) => m.votes));
  const isWinner = (m: Meme) =>
    phase === "ended" &&
    (contest.winner_id != null ? m.id === contest.winner_id : topVotes > 0 && m.votes === topVotes);

  return (
    <>
      <h1 className="text-4xl font-bold text-center">{contest.theme}</h1>
      <p className="text-lg text-gray-400">
        Prize: <span className="text-white font-bold">{contest.prize_amount} $CREW</span>
      </p>

      <div className="text-center">
        {phase === "submitting" && (
          <>
            <p className="text-purple-400 font-bold">Submissions open</p>
            <p className="text-sm text-gray-400">Voting opens in {formatCountdown(submitEnds - now)}</p>
          </>
        )}
        {phase === "voting" && (
          <>
            <p className="text-purple-400 font-bold">Voting open</p>
            <p className="text-sm text-gray-400">Voting ends in {formatCountdown(voteEnds - now)}</p>
          </>
        )}
        {phase === "ended" && <p className="text-purple-400 font-bold">Contest ended — final results</p>}
      </div>

      {phase === "submitting" && (
        <Link href="/submit" className="p-3 rounded bg-purple-600 font-bold">
          Submit your meme
        </Link>
      )}
      {phase === "voting" && <ConnectButton />}
      {status && <p>{status}</p>}

      {memes.length === 0 ? (
        <p className="text-gray-400">No approved memes yet.</p>
      ) : (
        <div className="grid gap-6 w-full max-w-4xl sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m, i) => {
            const winner = isWinner(m);
            const mine = myVote === m.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col rounded border overflow-hidden bg-gray-900 ${
                  winner ? "border-yellow-400 ring-2 ring-yellow-400" : mine ? "border-purple-500" : "border-gray-800"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.image_url} alt={m.caption || "Meme"} className="w-full aspect-square object-contain bg-black" />
                <div className="flex flex-col gap-2 p-3 flex-1">
                  {winner && <p className="text-yellow-400 font-bold">🏆 Winner</p>}
                  {phase === "ended" && !winner && <p className="text-gray-500 text-sm">#{i + 1}</p>}
                  {m.caption && <p className="break-words">{m.caption}</p>}
                  <p className="text-xs text-gray-500">by {shortWallet(m.wallet)}</p>
                  {phase !== "submitting" && (
                    <p className="font-bold">
                      {m.votes} vote{m.votes === 1 ? "" : "s"}
                    </p>
                  )}
                  {phase === "voting" && (
                    <button
                      onClick={() => vote(m.id)}
                      disabled={!wallet || myVote != null || busyId != null || m.wallet === wallet}
                      className="mt-auto p-2 rounded bg-purple-600 font-bold disabled:opacity-50"
                    >
                      {mine ? "✓ Your vote" : m.wallet === wallet ? "Your meme" : busyId === m.id ? "Voting..." : "Vote"}
                    </button>
                  )}
                  {phase === "ended" && mine && <p className="text-purple-400 text-sm">✓ You voted for this</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {phase === "submitting" && memes.length > 0 && (
        <p className="text-sm text-gray-500">Voting isn&apos;t open yet.</p>
      )}
    </>
  );
}
