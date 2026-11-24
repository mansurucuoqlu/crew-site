"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import ConnectButton from "@/components/ConnectButton";
import { DAY_MS, formatCountdown, shortAddr } from "@/lib/format";

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

function voteMessage(wallet: string, id: number) {
  return `CREW vote | Wallet: ${wallet} | Submission: ${id} | Time: ${Date.now()}`;
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

  const left = phase === "submitting" ? submitEnds - now : voteEnds - now;
  const statusTone = status.startsWith("❌") ? "text-ruby" : status.startsWith("✅") ? "text-neon" : "text-muted";

  return (
    <>
      <header className="flex flex-col items-center gap-4 text-center">
        <span className={`tag ${phase === "voting" ? "tag-green" : phase === "ended" ? "tag-gold" : "tag-green"}`}>
          {phase !== "ended" && <span className="led" />}
          {phase === "submitting" ? "Submissions open" : phase === "voting" ? "Voting open" : "Contest ended"}
        </span>
        <p className="hud-label">{"// Weekly contest"}</p>
        <h1 className="font-display text-3xl font-extrabold text-white sm:text-5xl">{contest.theme}</h1>
      </header>

      <div className="panel grid w-full max-w-3xl divide-line sm:grid-cols-2 sm:divide-x">
        <div className="flex flex-col gap-2 p-6">
          <p className="hud-label text-muted!">Prize</p>
          <p className="font-display text-2xl font-bold text-gold">{contest.prize_amount} $CREW</p>
        </div>
        <div className="flex flex-col gap-2 p-6">
          <p className="hud-label text-muted!">
            {phase === "submitting" ? "Voting opens in" : phase === "voting" ? "Voting ends in" : "Status"}
          </p>
          <p className={`font-display text-2xl font-bold tabular-nums ${phase !== "ended" && left < DAY_MS ? "text-ruby" : "text-white"}`}>
            {phase === "ended" ? "Final results" : formatCountdown(left)}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        {phase === "submitting" && (
          <>
            <Link href="/submit" className="btn btn-primary">Submit your meme</Link>
            {memes.length > 0 && <p className="text-sm text-muted">Voting isn&apos;t open yet. Here&apos;s what&apos;s in so far.</p>}
          </>
        )}
        {phase === "voting" && <ConnectButton />}
        {status && <p className={`font-semibold ${statusTone}`}>{status}</p>}
      </div>

      {memes.length === 0 ? (
        <div className="panel flex w-full max-w-md flex-col items-center gap-2 p-8 text-center">
          <p className="font-display text-xl font-bold text-white">No memes yet</p>
          <p className="text-muted">
            {phase === "submitting" ? "Be the first to submit one." : "No approved memes in this contest."}
          </p>
        </div>
      ) : (
        <div className="grid w-full gap-8 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m, i) => {
            const winner = isWinner(m);
            const mine = myVote === m.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${winner ? "-translate-y-2 drop-shadow-[0_0_28px_rgba(245,197,66,0.45)]" : ""}`}
              >
              <div className={`panel panel-hover flex flex-1 flex-col ${winner ? "panel-winner" : mine ? "panel-mine" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.image_url} alt={m.caption || "Meme"} className="aspect-square w-full bg-black object-contain" />
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    {winner ? (
                      <span className="tag tag-gold">🏆 Winner</span>
                    ) : phase === "ended" ? (
                      <span className="font-mono text-sm text-muted">#{String(i + 1).padStart(2, "0")}</span>
                    ) : (
                      <span />
                    )}
                    {phase !== "submitting" && (
                      <span className="font-display text-xl font-bold text-neon">
                        {m.votes} <span className="font-mono text-xs tracking-[0.2em]">VOTE{m.votes === 1 ? "" : "S"}</span>
                      </span>
                    )}
                  </div>
                  {m.caption && <p className="break-words">{m.caption}</p>}
                  <span className="chip self-start">by {shortAddr(m.wallet)}</span>
                  {phase === "voting" && (
                    <button
                      onClick={() => vote(m.id)}
                      disabled={!wallet || myVote != null || busyId != null || m.wallet === wallet}
                      className="btn btn-primary mt-auto"
                    >
                      {mine ? "✓ Your vote" : m.wallet === wallet ? "Your meme" : busyId === m.id ? "Voting..." : "Vote"}
                    </button>
                  )}
                  {phase === "ended" && mine && <span className="tag tag-green self-start">✓ You voted for this</span>}
                </div>
              </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
