"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

const noopSubscribe = () => () => {};

// Phones can't reach wallet apps from Safari/Chrome. Wallets only inject
// themselves inside their own in-app browser.
function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

// True inside a wallet's in-app browser, where a wallet is injected
function hasInjectedWallet() {
  const w = window as unknown as {
    phantom?: { solana?: unknown };
    solana?: unknown;
    solflare?: unknown;
    backpack?: unknown;
  };
  return !!(w.phantom?.solana || w.solana || w.solflare || w.backpack);
}

// Links that reopen the current page inside each wallet's in-app browser
const WALLET_APPS: { name: string; link: (url: string, ref: string) => string }[] = [
  { name: "Phantom", link: (url, ref) => `https://phantom.app/ul/browse/${url}?ref=${ref}` },
  { name: "Solflare", link: (url, ref) => `https://solflare.com/ul/v1/browse/${url}?ref=${ref}` },
  { name: "Backpack", link: (url, ref) => `https://backpack.app/ul/v1/browse/${url}?ref=${ref}` },
  { name: "Trust Wallet", link: (url) => `https://link.trustwallet.com/open_url?coin_id=501&url=${url}` },
  { name: "Coinbase Wallet", link: (url) => `https://go.cb-w.com/dapp?cb_url=${url}` },
];

function openIn(app: (typeof WALLET_APPS)[number]) {
  const url = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  window.location.href = app.link(url, ref);
}

function MobileWalletPicker() {
  const { setVisible } = useWalletModal();
  const android = useSyncExternalStore(noopSubscribe, isAndroid, () => false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when tapping outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="btn btn-primary" aria-expanded={open}>
        Connect wallet
      </button>
      {open && (
        <div className="panel absolute left-0 top-full z-50 mt-2 w-64 bg-panel! p-4 text-left [.nav-wallet_&]:left-auto [.nav-wallet_&]:right-0">
          <p className="hud-label mb-1">Open in your wallet</p>
          <p className="mb-3 text-sm leading-snug text-muted">
            Phone browsers can&apos;t see wallet apps. Pick yours to open this page inside it.
          </p>
          <div className="flex flex-col gap-2">
            {WALLET_APPS.map((app) => (
              <button key={app.name} type="button" onClick={() => openIn(app)} className="btn btn-ghost btn-sm justify-start">
                {app.name}
              </button>
            ))}
            {android && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setVisible(true);
                }}
                className="btn btn-ghost btn-sm justify-start"
              >
                Other installed wallet
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConnectButton() {
  const { wallets, connected } = useWallet();
  const mobile = useSyncExternalStore(noopSubscribe, isMobileBrowser, () => false);
  const injected = useSyncExternalStore(noopSubscribe, hasInjectedWallet, () => false);
  const detected = wallets.some((w) => w.readyState === "Installed" && w.adapter.name !== "Mobile Wallet Adapter");

  if (mobile && !injected && !detected && !connected) return <MobileWalletPicker />;
  return <WalletMultiButton />;
}
