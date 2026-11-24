import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkHolder } from "@/lib/checkHolder";
import { verifyVoteMessage } from "@/lib/verifySignature";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// GET /api/vote?contestId=3&wallet=X -> which submission this wallet voted for
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contestId = Number(searchParams.get("contestId"));
  const wallet = searchParams.get("wallet");
  if (!contestId || !wallet) return err("Missing contestId or wallet", 400);

  const { data, error } = await supabaseAdmin
    .from("contest_votes")
    .select("submission_id")
    .eq("contest_id", contestId)
    .eq("wallet", wallet)
    .maybeSingle();
  if (error) return err(error.message, 500);
  return NextResponse.json({ submissionId: data?.submission_id ?? null });
}

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return err("Bad request", 400);
  }
  const { wallet, message, signature } = body ?? {};
  const submissionId = Number(body?.submissionId);
  if (!wallet || !message || !signature || !Number.isInteger(submissionId)) {
    return err("Missing fields", 400);
  }

  // 1. Signed by this wallet, for this submission, in the last 5 minutes
  if (!verifyVoteMessage(wallet, message, signature, submissionId, 5 * 60 * 1000)) {
    return err("Invalid or expired signature, try again", 401);
  }

  // 2. Must hold $CREW (skipped in test mode)
  if (process.env.TEST_MODE !== "true") {
    try {
      const { holder } = await checkHolder(wallet);
      if (!holder) return err("Only $CREW holders can vote", 403);
    } catch {
      return err("Could not check holdings, try again", 500);
    }
  }

  // 3. Submission must be approved and its contest must be in the voting phase
  const { data: sub, error: subErr } = await supabaseAdmin
    .from("submissions")
    .select("id, wallet, status, contest_id, contests!contest_id(submit_ends, vote_ends)")
    .eq("id", submissionId)
    .maybeSingle();
  if (subErr) return err(subErr.message, 500);
  if (!sub || sub.status !== "approved") return err("Meme not found", 404);

  const contest = Array.isArray(sub.contests) ? sub.contests[0] : sub.contests;
  const now = Date.now();
  if (!contest || now < Date.parse(contest.submit_ends) || now >= Date.parse(contest.vote_ends)) {
    return err("Voting is not open for this contest", 400);
  }

  // 4. No voting for yourself
  if (sub.wallet === wallet) return err("You can't vote for your own meme", 403);

  // 5. Make sure the holder exists (foreign key), then save the vote
  const { error: holderErr } = await supabaseAdmin
    .from("holders")
    .upsert({ wallet }, { onConflict: "wallet", ignoreDuplicates: true });
  if (holderErr) return err(holderErr.message, 500);

  const { error: voteErr } = await supabaseAdmin.from("contest_votes").insert({
    contest_id: sub.contest_id,
    submission_id: submissionId,
    wallet,
    signature,
  });
  if (voteErr) {
    if (voteErr.code === "23505") return err("You already voted in this contest", 409);
    return err("Vote failed: " + voteErr.message, 500);
  }

  return NextResponse.json({ ok: true });
}
