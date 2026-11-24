"use client";

import { Component, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

function CoinFallback() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/coin.svg" alt="" className="h-full w-full object-contain p-[12%]" />;
}

// three.js only loads in the browser, after the page's text is on screen
const Coin3D = dynamic(() => import("@/components/Coin3D"), {
  ssr: false,
  loading: () => <CoinFallback />,
});

let webglCache: boolean | undefined;
function hasWebGL() {
  if (webglCache === undefined) {
    try {
      const c = document.createElement("canvas");
      webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}

const noopSubscribe = () => () => {};
const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

// If WebGL fails mid-render (lost context, driver issue), show the static coin
class CoinBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <CoinFallback /> : this.props.children;
  }
}

export default function HeroCoin() {
  const webgl = useSyncExternalStore(noopSubscribe, hasWebGL, () => false);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);

  return (
    <div className="relative aspect-square w-full max-w-[520px]">
      <div className="coin-glow absolute inset-[8%] rounded-full" aria-hidden />
      <div className="absolute inset-0">
        {webgl ? (
          <CoinBoundary>
            <Coin3D still={reduced} />
          </CoinBoundary>
        ) : (
          <CoinFallback />
        )}
      </div>
    </div>
  );
}
