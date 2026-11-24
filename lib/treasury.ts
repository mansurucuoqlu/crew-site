import { cacheLife } from "next/cache";

// Server only: uses HELIUS_API_KEY. Results are cached ~5 minutes to save API credits.

const TOKEN_PROGRAMS = [
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // SPL Token
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // Token-2022
];
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export type TokenBalance = { mint: string; symbol: string; amount: number };
export type TreasuryTx = {
  signature: string;
  timestamp: number; // ms
  direction: "In" | "Out" | "Other";
  amounts: { symbol: string; amount: number }[]; // net change for the treasury, + in / - out
  failed: boolean;
};
export type TreasuryData = {
  sol: number;
  tokens: TokenBalance[];
  txs: TreasuryTx[];
  fetchedAt: number;
};

export function tokenSymbol(mint: string) {
  if (mint === USDC_MINT) return "USDC";
  if (mint && mint === process.env.NEXT_PUBLIC_CREW_MINT) return "$CREW";
  return `${mint.slice(0, 4)}…`;
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`${method}: ${data.error.message}`);
  return data.result;
}

type ParsedTokenAccount = {
  account: {
    data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number | null } } } };
  };
};

type HeliusTx = {
  signature: string;
  timestamp: number; // seconds
  transactionError: unknown;
  nativeTransfers?: { fromUserAccount: string; toUserAccount: string; amount: number }[];
  tokenTransfers?: { fromUserAccount: string; toUserAccount: string; tokenAmount: number; mint: string }[];
};

export async function getTreasuryData(address: string): Promise<TreasuryData> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });

  const [lamports, tokenLists, history] = await Promise.all([
    rpc<{ value: number }>("getBalance", [address]),
    Promise.all(
      TOKEN_PROGRAMS.map((programId) =>
        rpc<{ value: ParsedTokenAccount[] }>("getTokenAccountsByOwner", [
          address,
          { programId },
          { encoding: "jsonParsed" },
        ])
      )
    ),
    fetch(
      `https://api-mainnet.helius-rpc.com/v0/addresses/${address}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=20`
    ).then(async (r) => {
      if (!r.ok) throw new Error(`Helius transactions: ${r.status}`);
      return (await r.json()) as HeliusTx[];
    }),
  ]);

  // Token balances, summed per mint, skipping empty accounts
  const byMint = new Map<string, number>();
  for (const acc of tokenLists.flatMap((l) => l.value)) {
    const { mint, tokenAmount } = acc.account.data.parsed.info;
    byMint.set(mint, (byMint.get(mint) ?? 0) + (tokenAmount.uiAmount ?? 0));
  }
  const tokens = [...byMint]
    .filter(([, amount]) => amount > 0)
    .map(([mint, amount]) => ({ mint, symbol: tokenSymbol(mint), amount }));

  // Net change per token for each transaction, from the treasury's point of view
  const txs = history.map((tx): TreasuryTx => {
    const net = new Map<string, number>();
    const add = (symbol: string, n: number) => net.set(symbol, (net.get(symbol) ?? 0) + n);
    for (const t of tx.nativeTransfers ?? []) {
      if (t.toUserAccount === address) add("SOL", t.amount / 1e9);
      if (t.fromUserAccount === address) add("SOL", -t.amount / 1e9);
    }
    for (const t of tx.tokenTransfers ?? []) {
      if (t.toUserAccount === address) add(tokenSymbol(t.mint), t.tokenAmount);
      if (t.fromUserAccount === address) add(tokenSymbol(t.mint), -t.tokenAmount);
    }
    const amounts = [...net]
      .filter(([, amount]) => amount !== 0)
      .map(([symbol, amount]) => ({ symbol, amount }));
    const anyIn = amounts.some((a) => a.amount > 0);
    const anyOut = amounts.some((a) => a.amount < 0);
    return {
      signature: tx.signature,
      timestamp: tx.timestamp * 1000,
      direction: anyOut ? "Out" : anyIn ? "In" : "Other",
      amounts,
      failed: tx.transactionError != null,
    };
  });

  return { sol: lamports.value / 1e9, tokens, txs, fetchedAt: Date.now() };
}
