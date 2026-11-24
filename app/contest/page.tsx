import { Suspense } from "react";
import { connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentContest } from "@/lib/contests";
import ContestView, { type Meme } from "@/components/ContestView";

export default function ContestPage() {
  return (
    <main className="page">
      <Suspense fallback={<p className="text-muted">Loading contest...</p>}>
        <CurrentContest />
      </Suspense>
    </main>
  );
}

function Notice({ title, body, tone = "" }: { title: string; body: string; tone?: string }) {
  return (
    <div className="panel flex w-full max-w-md flex-col items-center gap-2 p-8 text-center">
      <p className={`font-display text-3xl ${tone}`}>{title}</p>
      <p className="text-muted">{body}</p>
    </div>
  );
}

async function CurrentContest() {
  // Render on every request so the phase and vote counts are always fresh
  await connection();
  const now = new Date();

  const { data: contest, error } = await getCurrentContest(now);

  if (error) return <Notice title="Oops" body="Could not load the contest. Try again in a moment." tone="text-ruby" />;
  if (!contest) return <Notice title="No contest right now" body="Check back soon. A new theme drops every week." />;

  const { data: memes, error: memesErr } = await supabaseAdmin
    .from("submission_results")
    .select("id, wallet, image_url, caption, votes")
    .eq("contest_id", contest.id)
    .order("id", { ascending: true })
    .returns<Meme[]>();

  if (memesErr) return <Notice title="Oops" body="Could not load memes. Try again in a moment." tone="text-ruby" />;

  return <ContestView contest={contest} memes={memes ?? []} serverNow={now.getTime()} />;
}
