import { NextResponse } from "next/server";
import { checkHolder } from "@/lib/checkHolder";

export async function POST(req: Request) {
  const { wallet } = await req.json();
  if (!wallet) {
    return NextResponse.json({ error: "No wallet" }, { status: 400 });
  }
  try {
    return NextResponse.json(await checkHolder(wallet));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}