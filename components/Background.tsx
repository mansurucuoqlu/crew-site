"use client";

import { Component, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// three.js only loads in the browser, after the page's text is on screen
const Hero3D = dynamic(() => import("@/components/Hero3D"), { ssr: false });

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

// If WebGL fails mid-render, keep showing the flat picture
class Boundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Full-page bulls picture behind every page (3D when possible), with a dark
// overlay so text stays readable. Home starts bright and darkens as you scroll.
export default function Background() {
  const webgl = useSyncExternalStore(noopSubscribe, hasWebGL, () => false);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => false);
  const [ready, setReady] = useState(false);
  // Small delay so the first 3D frame is painted before the flat picture fades out
  const onReady = useCallback(() => setTimeout(() => setReady(true), 150), []);

  const home = usePathname() === "/";
  const shade = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = shade.current;
    if (!el) return;
    if (!home) {
      el.style.opacity = "1";
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      el.style.opacity = String(Math.min(1, window.scrollY / (window.innerHeight * 0.8)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [home]);

  return (
    <div className="absolute inset-0">
      {/* Flat picture: shows instantly, and stays if 3D isn't available */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/crew-hero.jpg"
        alt=""
        className={`absolute inset-0 h-full w-full object-cover object-[50%_10%] transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}
        fetchPriority="high"
      />
      {webgl && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <Boundary>
            <Suspense fallback={null}>
              <Hero3D still={reduced} onReady={onReady} />
            </Suspense>
          </Boundary>
        </div>
      )}

      {/* Base shade: keeps the left side (where the headline sits) and the bottom dark */}
      <div className="bg-shade absolute inset-0" />
      {/* Extra shade: full on inner pages, fades in with scroll on home */}
      <div ref={shade} className="absolute inset-0 bg-background/85 transition-opacity duration-300" style={{ opacity: home ? 0 : 1 }} />
    </div>
  );
}
