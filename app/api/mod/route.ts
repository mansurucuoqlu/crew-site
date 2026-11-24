import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySignedMessage } from "@/lib/verifySignature";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return err("Bad request", 400);
  }
  const { wallet, message, signature, action, submissionId } = body ?? {};

  // 1. Signed in? (valid for 30 minutes)
  if (!wallet || !message || !signature ||
      !verifySignedMessage(wallet, message, signature, "CREW mod", 30 * 60 * 1000)) {
    return err("Sign in again", 401);
  }

  // 2. Is this wallet a mod?
  const mods = (process.env.MOD_WALLETS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!mods.includes(wallet)) return err("Not a mod", 403);

  // 3. List pending memes
  if (action === "list") {
    const { data, error } = await supabaseAdmin
      .from("submissions")
      .select("id, image_url, caption, wallet, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) return err(error.message, 500);
    return NextResponse.json({ submissions: data });
  }

  // 4. Approve or reject one meme
  if (action === "approve" || action === "reject") {
    if (submissionId == null) return err("Missing submissionId", 400);
    const { data, error } = await supabaseAdmin
      .from("submissions")
      .update({ status: action === "approve" ? "approved" : "rejected" })
      .eq("id", submissionId)
      .eq("status", "pending")
      .select("id");
    if (error) return err(error.message, 500);
    // Nothing updated: wrong id, or another mod already handled it
    if (!data?.length) return err("Already moderated or not found", 409);
    return NextResponse.json({ ok: true });
  }

  return err("Unknown action", 400);
}