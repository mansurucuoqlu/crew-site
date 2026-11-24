import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Contest } from "@/components/ContestView";

// The most recent contest that has started (server only)
export async function getCurrentContest(now: Date) {
  return supabaseAdmin
    .from("contests")
    .select("id, theme, starts_at, submit_ends, vote_ends, prize_amount, winner_id")
    .lte("starts_at", now.toISOString())
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle<Contest>();
}
