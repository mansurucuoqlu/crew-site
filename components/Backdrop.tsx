import Background from "@/components/Background";

// Fixed background layers: bulls picture, shade, grid, animated circuit traces, scanlines
export default function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <Background />
      <div className="bg-grid absolute inset-0 opacity-50" />
      <svg className="absolute inset-0 h-full w-full opacity-30">
        <defs>
          <linearGradient id="trace" x1="0" x2="1">
            <stop offset="0%" stopColor="#d9dde2" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d9dde2" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="circuit-line" d="M0 140 H200 V240 H440 V100 H760" fill="none" stroke="url(#trace)" strokeWidth="1.2" />
        <path className="circuit-line" d="M1600 660 H1000 V380 H640" fill="none" stroke="url(#trace)" strokeWidth="1" style={{ animationDelay: "-3s" }} />
        <path className="circuit-line" d="M0 820 H320 V700 H560" fill="none" stroke="url(#trace)" strokeWidth="1" style={{ animationDelay: "-5s" }} />
      </svg>
      <div className="scanlines absolute inset-0 opacity-30" />
    </div>
  );
}
