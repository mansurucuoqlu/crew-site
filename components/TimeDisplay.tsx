"use client";

import { useEffect, useState } from "react";

// Shows a timestamp in the viewer's own timezone
export function LocalTime({ ms }: { ms: number }) {
  return (
    <time dateTime={new Date(ms).toISOString()} suppressHydrationWarning>
      {new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
    </time>
  );
}

function ago(ms: number) {
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min === 1) return "1 minute ago";
  return `${min} minutes ago`;
}

// "Updated 3 minutes ago", ticking every 30s
export function UpdatedAgo({ at }: { at: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  return (
    <span className="text-xs text-gray-500">
      Updated {now == null ? "recently" : ago(now - at)}
    </span>
  );
}
