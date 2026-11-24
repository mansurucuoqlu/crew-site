type TokenAccount = {
  account: {
    data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } };
  };
};

export async function checkHolder(wallet: string) {
  const mint = process.env.NEXT_PUBLIC_CREW_MINT;
  const key = process.env.HELIUS_API_KEY;

  if (!mint) return { holder: false, balance: 0, note: "Coin not launched yet" };

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
  if (data.error) throw new Error(data.error.message);

  const accounts: TokenAccount[] = data.result.value;
  const balance = accounts.reduce(
    (sum, acc) => sum + (acc.account.data.parsed.info.tokenAmount.uiAmount ?? 0),
    0
  );

  return { holder: balance > 0, balance };
}