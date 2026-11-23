import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { wallet } = await req.json();
  const mint = process.env.NEXT_PUBLIC_CREW_MINT;
  const key = process.env.HELIUS_API_KEY;

  if (!wallet) {
    return NextResponse.json({ error: "No wallet" }, { status: 400 });
  }
  if (!mint) {
    return NextResponse.json({ holder: false, balance: 0, note: "Coin not launched yet" });
  }

  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [wallet, { mint }, { encoding: "jsonParsed" }],
    }),
  });

  const data = await res.json();
  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 500 });
  }

  const balance = data.result.value.reduce(
    (sum: number, acc: any) =>
      sum + (acc.account.data.parsed.info.tokenAmount.uiAmount ?? 0),
    0
  );

  return NextResponse.json({ holder: balance > 0, balance });
}