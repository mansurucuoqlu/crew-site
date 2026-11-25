import { Suspense } from "react";
import { connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTreasuryData, type TreasuryData } from "@/lib/treasury";
import CopyButton from "@/components/CopyButton";
import { LocalTime, UpdatedAgo } from "@/components/TimeDisplay";
import { shortAddr } from "@/lib/format";

const TREASURY = process.env.NEXT_PUBLIC_TREASURY_WALLET ?? "";

type Payout = {
  id: number;
  tx_signature: string;
  to_wallet: string;
  amount: number;
  reason: string | null;
  created_at: string;
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export default function TreasuryPage() {
  return (
    <main className="page">
      <span className="tag tag-accent"><span className="led" /> Public &amp; on-chain</span>
      <h1 className="font-display text-center text-3xl font-extrabold text-white sm:text-5xl">
        Crew <span className="text-chrome">Treasury</span>
      </h1>
      {TREASURY ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="chip text-sm" title={TREASURY}>{shortAddr(TREASURY)}</span>
          <CopyButton text={TREASURY} />
          <a
            href={`https://solscan.io/account/${TREASURY}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
          >
            View on Solscan ↗
          </a>
        </div>
      ) : (
        <p className="text-ruby">Treasury wallet is not configured</p>
      )}

      {TREASURY && (
        <Suspense fallback={<p className="text-muted">Loading treasury...</p>}>
          <TreasuryDetails />
        </Suspense>
      )}
    </main>
  );
}

async function TreasuryDetails() {
  // Payouts are read fresh each visit; Helius data comes from a ~5 minute cache
  await connection();

  const [chain, payoutsRes] = await Promise.all([
    getTreasuryData(TREASURY).catch((e: Error) => {
      console.error("Treasury Helius error:", e.message);
      return null;
    }),
    supabaseAdmin
      .from("payouts")
      .select("id, tx_signature, to_wallet, amount, reason, created_at")
      .order("created_at", { ascending: false })
      .returns<Payout[]>(),
  ]);

  if (payoutsRes.error) console.error("Treasury payouts error:", payoutsRes.error.message);
  const payouts = payoutsRes.data ?? [];
  const reasonBySig = new Map(payouts.map((p) => [p.tx_signature, p.reason]));

  return (
    <div className="flex w-full max-w-4xl flex-col gap-8">
      {chain ? (
        <>
          <Balances chain={chain} />
          <Activity chain={chain} reasonBySig={reasonBySig} />
        </>
      ) : (
        <p className="panel p-6 text-center text-ruby">❌ Couldn&apos;t load on-chain data right now. Try again in a minute.</p>
      )}
      <Payouts payouts={payouts} failed={!!payoutsRes.error} />
    </div>
  );
}

function Balances({ chain }: { chain: TreasuryData }) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-white sm:text-2xl"><span className="hud-label mr-3">01</span>Balance</h2>
        <UpdatedAgo at={chain.fetchedAt} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="clip-md bg-background/70 p-4 shadow-[inset_0_0_0_1px_var(--line)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">SOL</p>
          <p className="font-display text-3xl font-bold text-chrome">{fmt(chain.sol)}</p>
        </div>
        {chain.tokens.map((t) => (
          <div key={t.mint} className="clip-md bg-background/70 p-4 shadow-[inset_0_0_0_1px_var(--line)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted" title={t.mint}>{t.symbol}</p>
            <p className="font-display text-3xl font-bold text-chrome">{fmt(t.amount)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Activity({
  chain,
  reasonBySig,
}: {
  chain: TreasuryData;
  reasonBySig: Map<string, string | null>;
}) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-white sm:text-2xl"><span className="hud-label mr-3">02</span>Recent activity</h2>
      {chain.txs.length === 0 ? (
        <div className="border border-dashed border-line p-6 text-center font-mono text-sm uppercase tracking-[0.15em] text-muted">No transactions yet. Activity will show up here once the treasury is used.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {chain.txs.map((tx) => {
            const reason = reasonBySig.get(tx.signature);
            return (
              <li
                key={tx.signature}
                className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-l-2 bg-background/60 px-3 py-2.5 text-sm ${
                  tx.direction === "In" ? "border-accent" : tx.direction === "Out" ? "border-ruby" : "border-line"
                }`}
              >
                <span className="w-40 text-muted"><LocalTime ms={tx.timestamp} /></span>
                <span className={`tag w-14 justify-center ${tx.direction === "In" ? "tag-accent" : tx.direction === "Out" ? "tag-red" : ""}`}>
                  {tx.direction}
                </span>
                <span className={`flex-1 font-semibold ${tx.direction === "In" ? "text-accent" : tx.direction === "Out" ? "text-ruby" : ""}`}>
                  {tx.amounts.length === 0
                    ? "—"
                    : tx.amounts
                        .map((a) => `${a.amount > 0 ? "+" : ""}${fmt(a.amount)} ${a.symbol}`)
                        .join(", ")}
                  {tx.failed && <span className="ml-2 text-muted">(failed)</span>}
                  {reason && <span className="ml-2 font-normal text-accent">· {reason}</span>}
                </span>
                <a
                  href={`https://solscan.io/tx/${tx.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-mist hover:text-accent"
                >
                  Solscan ↗
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Payouts({ payouts, failed }: { payouts: Payout[]; failed: boolean }) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-white sm:text-2xl"><span className="hud-label mr-3">03</span>Payouts</h2>
      {failed ? (
        <p className="text-ruby">❌ Couldn&apos;t load payouts.</p>
      ) : payouts.length === 0 ? (
        <div className="border border-dashed border-line p-6 text-center font-mono text-sm uppercase tracking-[0.15em] text-muted">No payouts yet. Contest winners will show up here.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {payouts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 border-silver bg-background/60 px-3 py-2.5 text-sm">
              <span className="flex-1 min-w-48 font-bold">{p.reason || "Payout"}</span>
              <span className="chip" title={p.to_wallet}>→ {shortAddr(p.to_wallet)}</span>
              <span className="font-bold text-white">{fmt(Number(p.amount))} $CREW</span>
              <span className="text-muted"><LocalTime ms={Date.parse(p.created_at)} /></span>
              <a
                href={`https://solscan.io/tx/${p.tx_signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-mist hover:text-accent"
              >
                Solscan ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
