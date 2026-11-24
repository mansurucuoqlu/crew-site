export const DAY_MS = 24 * 60 * 60 * 1000;

export function shortAddr(a: string, chars = 4) {
  return `${a.slice(0, chars)}…${a.slice(-chars)}`;
}

export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d > 0 ? `${d}d ` : ""}${h}h ${m}m ${sec}s`;
}
