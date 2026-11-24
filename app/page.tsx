import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import ConnectButton from "@/components/ConnectButton";
import HolderStatus from "@/components/HolderStatus";
import HeroCoin from "@/components/HeroCoin";
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
        {title} <span className="text-neon text-glow">{accent}</span>
      </h2>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-gradient-to-b from-neon via-lime to-transparent" aria-hidden />
        <div className="mx-auto grid min-h-[min(calc(100dvh-110px),820px)] max-w-7xl items-center gap-8 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-x-10 lg:gap-y-0">
          {/* Phone order: coin, text, specs. Desktop: text left, coin + specs right */}
          <div className="order-2 flex flex-col gap-6 lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <span className="tag tag-green self-start">
              <span className="led" /> $CREW on · Solana
            </span>

            <div>
              <p className="mb-2 font-mono text-xs tracking-[0.5em] text-neon">COMMUNITY EDITION</p>
              <h1 className="font-display text-6xl font-black leading-none tracking-[0.06em] text-white sm:text-8xl">
                $<span className="text-neon text-glow">CREW</span>
              </h1>
            </div>

            <p className="max-w-2xl text-xl font-medium leading-snug text-mist sm:text-2xl">
              A community-run Solana memecoin. Weekly meme contests, holder votes, and a treasury anyone can audit.
            </p>
            <p className="font-display text-[11px] uppercase tracking-[0.38em] text-neon sm:text-xs">
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

          <div className="order-1 flex justify-center lg:order-none lg:col-start-2 lg:row-start-1 lg:self-end">
            <HeroCoin />
          </div>
          <div className="order-3 flex justify-center lg:order-none lg:col-start-2 lg:row-start-2 lg:justify-end lg:self-start">
            <div className="panel w-full max-w-sm p-5 lg:-mt-16">
              <div className="mb-2 flex items-center justify-between">
                <span className="hud-label">Crew specs</span>
                <span className="font-mono text-[10px] text-muted">REV 01</span>
              </div>
              {SPECS.map(([k, v, hi]) => (
                <div key={k} className="spec-row">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{k}</span>
                  <span className={`font-display text-sm font-bold ${hi ? "text-neon" : "text-white"}`}>{v}</span>
                </div>
              ))}
            </div>
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
                <p className="font-mono text-xs tracking-[0.3em] text-neon">STEP 0{i + 1}</p>
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
                <span className="tag tag-green self-start"><span className="led" /> Public treasury</span>
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
            Join the <span className="text-neon text-glow">Crew</span>
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
        <p className="font-display text-2xl font-bold text-gold">{contest ? `${contest.prize_amount} $CREW` : "—"}</p>
      </div>
      <Link href="/treasury" className={`${cell} group`}>
        <p className="hud-label text-muted!">Treasury</p>
        <p className="font-display text-2xl font-bold text-neon group-hover:text-glow">
          {chain ? `${chain.sol.toLocaleString("en-US", { maximumFractionDigits: 3 })} SOL` : "—"}
        </p>
      </Link>
      <div className="col-span-full flex justify-end border-t border-line p-4">
        <Link href="/contest" className="btn btn-primary btn-sm">Enter the contest →</Link>
      </div>
    </div>
  );
}
