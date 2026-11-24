"use client";

import { useEffect, useState } from "react";
import { DAY_MS, formatCountdown } from "@/lib/format";

// Live phase + countdown for the home page. Turns red under 24h.
export default function ContestCountdown({
  submitEnds,
  voteEnds,
  serverNow,
}: {
  submitEnds: number;
  voteEnds: number;
  serverNow: number;
}) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now >= voteEnds) {
    return (
      <>
        <p className="hud-label text-muted!">Status</p>
        <p className="font-display text-2xl font-bold text-white">Ended</p>
      </>
    );
  }
  const voting = now >= submitEnds;
  const left = (voting ? voteEnds : submitEnds) - now;
  return (
    <>
      <p className="hud-label text-muted!">{voting ? "Voting ends in" : "Voting opens in"}</p>
      <p className={`font-display text-2xl font-bold tabular-nums ${left < DAY_MS ? "text-ruby" : "text-white"}`}>
        {formatCountdown(left)}
      </p>
    </>
  );
}
