import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTreasuryData, type TreasuryData } from "@/lib/treasury";
import CopyButton from "@/components/CopyButton";
import { LocalTime, UpdatedAgo } from "@/components/TimeDisplay";

const TREASURY = process.env.NEXT_PUBLIC_TREASURY_WALLET ?? "";

type Payout = {
  id: number;
  tx_signature: string;
  to_wallet: string;
  amount: number;
  reason: string | null;
  created_at: string;
};

function shortAddr(a: string) {
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export default function TreasuryPage() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 bg-black text-white p-4">
      <nav className="self-start flex gap-4 text-sm text-gray-400">
        <Link href="/" className="hover:text-white">← Home</Link>
        <Link href="/contest" className="hover:text-white">Contest</Link>
      </nav>

      <h1 className="text-4xl font-bold mt-4">Crew Treasury</h1>
      {TREASURY ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="font-mono text-gray-300" title={TREASURY}>{shortAddr(TREASURY)}</span>
          <CopyButton text={TREASURY} />
          <a
            href={`https://solscan.io/account/${TREASURY}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            View on Solscan ↗
          </a>
        </div>
      ) : (
        <p className="text-red-400">Treasury wallet is not configured</p>
      )}

      {TREASURY && (
        <Suspense fallback={<p className="text-gray-400">Loading treasury...</p>}>
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
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      {chain ? (
        <>
          <Balances chain={chain} />
          <Activity chain={chain} reasonBySig={reasonBySig} />
        </>
      ) : (
        <p className="text-center text-red-400">❌ Couldn&apos;t load on-chain data right now. Try again in a minute.</p>
      )}
      <Payouts payouts={payouts} failed={!!payoutsRes.error} />
    </div>
  );
}

function Balances({ chain }: { chain: TreasuryData }) {
  return (
    <section className="rounded border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">Balance</h2>
        <UpdatedAgo at={chain.fetchedAt} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded bg-black p-3">
          <p className="text-sm text-gray-400">SOL</p>
          <p className="text-2xl font-bold text-purple-400">{fmt(chain.sol)}</p>
        </div>
        {chain.tokens.map((t) => (
          <div key={t.mint} className="rounded bg-black p-3">
            <p className="text-sm text-gray-400" title={t.mint}>{t.symbol}</p>
            <p className="text-2xl font-bold text-purple-400">{fmt(t.amount)}</p>
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
    <section className="rounded border border-gray-800 bg-gray-900 p-4">
      <h2 className="text-xl font-bold mb-3">Recent activity</h2>
      {chain.txs.length === 0 ? (
        <p className="text-gray-400">No transactions yet.</p>
      ) : (
        <ul className="divide-y divide-gray-800">
          {chain.txs.map((tx) => {
            const reason = reasonBySig.get(tx.signature);
            return (
              <li key={tx.signature} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
                <span className="text-gray-400 w-40"><LocalTime ms={tx.timestamp} /></span>
                <span
                  className={`w-12 font-bold ${
                    tx.direction === "In" ? "text-green-400" : tx.direction === "Out" ? "text-red-400" : "text-gray-400"
                  }`}
                >
                  {tx.direction}
                </span>
                <span className="flex-1">
                  {tx.amounts.length === 0
                    ? "—"
                    : tx.amounts
                        .map((a) => `${a.amount > 0 ? "+" : ""}${fmt(a.amount)} ${a.symbol}`)
                        .join(", ")}
                  {tx.failed && <span className="ml-2 text-red-400">(failed)</span>}
                  {reason && <span className="ml-2 text-purple-400">· {reason}</span>}
                </span>
                <a
                  href={`https://solscan.io/tx/${tx.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300"
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
    <section className="rounded border border-gray-800 bg-gray-900 p-4">
      <h2 className="text-xl font-bold mb-3">Payouts</h2>
      {failed ? (
        <p className="text-red-400">❌ Couldn&apos;t load payouts.</p>
      ) : payouts.length === 0 ? (
        <p className="text-gray-400">No payouts yet. Contest winners will show up here.</p>
      ) : (
        <ul className="divide-y divide-gray-800">
          {payouts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
              <span className="flex-1 min-w-48 font-bold">{p.reason || "Payout"}</span>
              <span className="font-mono text-gray-300" title={p.to_wallet}>→ {shortAddr(p.to_wallet)}</span>
              <span className="text-purple-400 font-bold">{fmt(Number(p.amount))} $CREW</span>
              <span className="text-gray-400"><LocalTime ms={Date.parse(p.created_at)} /></span>
              <a
                href={`https://solscan.io/tx/${p.tx_signature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300"
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
