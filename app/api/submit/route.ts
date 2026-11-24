import { NextResponse } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkHolder } from "@/lib/checkHolder";

const MAX_SIZE = 4 * 1024 * 1024; // 4 MB
const ALLOWED = ["image/jpeg", "image/png", "image/gif"];

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const wallet = form.get("wallet") as string | null;
  const rawMessage = form.get("message") as string | null;
  const signature = form.get("signature") as string | null;
  const caption = (form.get("caption") as string | null) ?? "";
  const file = form.get("file") as File | null;

  if (!wallet || !rawMessage || !signature || !file) return err("Missing fields", 400);

  // Browsers turn \n into \r\n in forms, so undo that
  const message = rawMessage.replace(/\r\n/g, "\n");

  // 1. Prove they own the wallet (accepts the one-line or multi-line format)
  const match = message.match(
    /^CREW submission(?:\n| \| )Wallet: (\w+)(?:\n| \| )Time: (\d+)$/
  );
  if (!match || match[1] !== wallet) return err("Bad message", 400);
  if (Date.now() - Number(match[2]) > 5 * 60 * 1000) {
    return err("Signature expired, try again", 400);
  }

  let valid = false;
  try {
    valid = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      bs58.decode(signature),
      bs58.decode(wallet)
    );
  } catch {
    valid = false;
  }
  if (!valid) return err("Invalid signature", 401);

  // 2. Must hold $CREW (skipped in test mode)
  try {
    const { holder } = await checkHolder(wallet);
    if (!holder && process.env.TEST_MODE !== "true") {
      return err("Only $CREW holders can submit", 403);
    }
  } catch {
    return err("Could not check holdings, try again", 500);
  }

  // 3. Find the contest open for submissions
  const now = new Date().toISOString();
  const { data: contest, error: contestErr } = await supabaseAdmin
    .from("contests")
    .select("id")
    .lte("starts_at", now)
    .gt("submit_ends", now)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (contestErr) {
    console.error("Contest lookup failed:", contestErr);
    return err("Could not load contests, try again", 500);
  }
  if (!contest) return err("No contest is open for submissions", 400);

  // 4. Check the file
  if (!ALLOWED.includes(file.type)) return err("Only JPG, PNG or GIF", 400);
  if (file.size > MAX_SIZE) return err("Max 4 MB", 400);

  // 5. Make sure the holder exists in the database
  await supabaseAdmin
    .from("holders")
    .upsert({ wallet }, { onConflict: "wallet", ignoreDuplicates: true });

  // 6. Upload the image
  const ext = file.type.split("/")[1];
  const path = `${contest.id}/${wallet}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("memes")
    .upload(path, file, { contentType: file.type });
  if (upErr) return err("Upload failed: " + upErr.message, 500);

  const { data: urlData } = supabaseAdmin.storage.from("memes").getPublicUrl(path);

  // 7. Save the submission (starts as "pending")
  const { error: dbErr } = await supabaseAdmin.from("submissions").insert({
    contest_id: contest.id,
    wallet,
    image_url: urlData.publicUrl,
    caption: caption.slice(0, 200),
  });

  if (dbErr) {
    await supabaseAdmin.storage.from("memes").remove([path]);
    if (dbErr.code === "23505") return err("You already submitted to this contest", 409);
    return err("Save failed: " + dbErr.message, 500);
  }

  return NextResponse.json({
    ok: true,
    message: "Submitted! It will show up after a mod approves it.",
  });
}