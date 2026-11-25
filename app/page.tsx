import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import ConnectButton from "@/components/ConnectButton";
import HolderStatus from "@/components/HolderStatus";
import CopyButton from "@/components/CopyButton";
import CaChip from "@/components/CaChip";
import ContestCountdown from "@/components/ContestCountdown";
import { SOCIALS } from "@/components/Footer";
import { getCurrentContest } from "@/lib/contests";
import { getTreasuryData } from "@/lib/treasury";
import { shortAddr } from "@/lib/format";

const TREASURY = process.env.NEXT_PUBLIC_TREASURY_WALLET ?? "";
const MINT = process.env.NEXT_PUBLIC_CREW_MINT || null;

const SPECS: [string, string, boolean?][] = [
  ["Name", "CREW"],
  ["Symbol", "$CREW", true],
  ["Chain", "Solana"],
  ["Dev", "None"],
  ["Boss", "None"],
  ["Treasury", "100% Public", true],
];

const STEPS = [
  { title: "Hold $CREW", body: "Grab some $CREW and connect your wallet. Holding makes you part of the Crew." },
  { title: "Submit memes", body: "Every week drops a new theme. Send in your best meme before submissions close." },
  { title: "The Crew votes", body: "Holders vote on the best meme. The winner gets paid straight from the public treasury." },
];

function SectionHead({ n, label, title, accent }: { n: string; label: string; title: string; accent: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="hud-label">{n} — {label}</p>
      <h2 className="font-display text-3xl font-extrabold tracking-wide text-white sm:text-5xl">
        {title} <span className="text-chrome">{accent}</span>
      </h2>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-gradient-to-b from-accent via-silver/40 to-transparent" aria-hidden />
        {/* Text sits right on the full-page background picture */}
        <div className="mx-auto flex min-h-[calc(100dvh-200px)] max-w-7xl flex-col justify-end px-4 pb-10 pt-[38vh] sm:px-6 lg:justify-center lg:pt-10">
          <div className="flex max-w-2xl flex-col gap-6">
            <span className="tag tag-accent self-start">
              <span className="led" /> $CREW on · Solana
            </span>

            <div>
              <p className="mb-2 font-mono text-xs tracking-[0.5em] text-silver">COMMUNITY EDITION</p>
              <h1 className="font-display text-6xl font-black leading-none tracking-[0.06em] text-white sm:text-8xl">
                $<span className="text-chrome">CREW</span>
              </h1>
            </div>

            <p className="max-w-xl text-xl font-medium leading-snug text-mist sm:text-2xl">
              A community-run Solana memecoin. Weekly meme contests, holder votes, and a treasury anyone can audit.
            </p>
            <p className="font-display text-[11px] uppercase tracking-[0.38em] text-accent sm:text-xs">
              No dev · No boss · Just the Crew
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <CaChip value={MINT} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/contest" className="btn btn-primary">
                Join the contest
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link href="/treasury" className="btn btn-ghost">Treasury</Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ConnectButton />
              <HolderStatus />
            </div>
          </div>
        </div>

        {/* Specs bar */}
        <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
          <div className="panel grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
            {SPECS.map(([k, v, hi]) => (
              <div key={k} className="flex flex-col gap-1 border-b border-line p-4 lg:border-b-0">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">{k}</span>
                <span className={`font-display text-sm font-bold ${hi ? "text-accent" : "text-white"}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-24 px-4 sm:px-6">
        {/* HOW IT WORKS */}
        <section className="flex flex-col gap-10">
          <SectionHead n="01" label="How it works" title="Meme. Vote." accent="Get paid." />
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="panel panel-hover flex flex-col gap-3 p-7">
                <p className="font-mono text-xs tracking-[0.3em] text-accent">STEP 0{i + 1}</p>
                <h3 className="font-display text-xl font-bold text-white">{s.title}</h3>
                <p className="text-lg leading-snug text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* LIVE */}
        <section className="flex flex-col gap-10">
          <SectionHead n="02" label="Live" title="This week's" accent="contest" />
          <Suspense fallback={<div className="panel h-36 animate-pulse" />}>
            <LiveStrip />
          </Suspense>
        </section>

        {/* TRANSPARENCY */}
        {TREASURY && (
          <section className="flex flex-col gap-10">
            <SectionHead n="03" label="Transparency" title="Fully" accent="on-chain" />
            <div className="panel flex flex-col gap-6 p-7 sm:p-10 md:flex-row md:items-center md:justify-between">
              <div className="flex max-w-xl flex-col gap-3">
                <span className="tag tag-accent self-start"><span className="led" /> Public treasury</span>
                <p className="text-xl leading-snug text-mist">
                  Every prize is paid from one public wallet. Check the balance and every payout yourself.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="chip" title={TREASURY}>{shortAddr(TREASURY, 6)}</span>
                <CopyButton text={TREASURY} />
                <a
                  href={`https://solscan.io/account/${TREASURY}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  Solscan ↗
                </a>
              </div>
            </div>
          </section>
        )}

        {/* COMMUNITY */}
        <section className="panel flex flex-col items-center gap-6 p-10 text-center sm:p-14">
          <p className="hud-label">04 — Community</p>
          <h2 className="font-display text-3xl font-extrabold text-white sm:text-5xl">
            Join the <span className="text-chrome">Crew</span>
          </h2>
          <p className="max-w-xl text-lg text-muted">No dev. No boss. Just a bunch of people making memes and voting on them.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                {s.icon}
                {s.label}
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

async function LiveStrip() {
  await connection();
  const now = new Date();
  const [{ data: contest }, chain] = await Promise.all([
    getCurrentContest(now),
    TREASURY ? getTreasuryData(TREASURY).catch(() => null) : Promise.resolve(null),
  ]);

  const cell = "flex flex-col gap-2 p-6";
  return (
    <div className="panel grid divide-line sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
      <div className={cell}>
        <p className="hud-label text-muted!">Theme</p>
        <p className="font-display text-2xl font-bold text-white">{contest?.theme ?? "Next contest soon"}</p>
      </div>
      <div className={cell}>
        {contest ? (
          <ContestCountdown
            submitEnds={Date.parse(contest.submit_ends)}
            voteEnds={Date.parse(contest.vote_ends)}
            serverNow={now.getTime()}
          />
        ) : (
          <p className="text-muted">Stay tuned</p>
        )}
      </div>
      <div className={cell}>
        <p className="hud-label text-muted!">Prize</p>
        <p className="font-display text-2xl font-bold text-white">{contest ? `${contest.prize_amount} $CREW` : "—"}</p>
      </div>
      <Link href="/treasury" className={`${cell} group`}>
        <p className="hud-label text-muted!">Treasury</p>
        <p className="font-display text-2xl font-bold text-accent group-hover:text-white">
          {chain ? `${chain.sol.toLocaleString("en-US", { maximumFractionDigits: 3 })} SOL` : "—"}
        </p>
      </Link>
      <div className="col-span-full flex justify-end border-t border-line p-4">
        <Link href="/contest" className="btn btn-primary btn-sm">Enter the contest →</Link>
      </div>
    </div>
  );
}
