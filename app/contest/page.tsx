import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ContestView, { type Contest, type Meme } from "@/components/ContestView";

export default function ContestPage() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-6 bg-black text-white p-4">
      <nav className="self-start flex gap-4 text-sm text-gray-400">
        <Link href="/" className="hover:text-white">← Home</Link>
        <Link href="/treasury" className="hover:text-white">Treasury</Link>
      </nav>
      <Suspense fallback={<p className="text-gray-400">Loading contest...</p>}>
        <CurrentContest />
      </Suspense>
    </main>
  );
}

async function CurrentContest() {
  // Render on every request so the phase and vote counts are always fresh
  await connection();
  const now = new Date();

  const { data: contest, error } = await supabaseAdmin
    .from("contests")
    .select("id, theme, starts_at, submit_ends, vote_ends, prize_amount, winner_id")
    .lte("starts_at", now.toISOString())
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle<Contest>();

  if (error) return <p className="text-red-400">❌ Could not load the contest</p>;
  if (!contest) return <p className="text-gray-400">No contest right now. Check back soon!</p>;

  const { data: memes, error: memesErr } = await supabaseAdmin
    .from("submission_results")
    .select("id, wallet, image_url, caption, votes")
    .eq("contest_id", contest.id)
    .order("id", { ascending: true })
    .returns<Meme[]>();

  if (memesErr) return <p className="text-red-400">❌ Could not load memes</p>;

  return <ContestView contest={contest} memes={memes ?? []} serverNow={now.getTime()} />;
}
