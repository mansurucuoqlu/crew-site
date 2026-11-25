"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";

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

// True inside Phantom/Solflare/etc. in-app browsers, where a wallet is injected
function hasInjectedWallet() {
  const w = window as unknown as { phantom?: { solana?: unknown }; solana?: unknown; solflare?: unknown };
  return !!(w.phantom?.solana || w.solana || w.solflare);
}

// Phantom universal link: reopens the current page inside Phantom's browser
function openInPhantom() {
  const url = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  window.location.href = `https://phantom.app/ul/browse/${url}?ref=${ref}`;
}

export default function ConnectButton() {
  const { wallets, connected } = useWallet();
  const mobile = useSyncExternalStore(noopSubscribe, isMobileBrowser, () => false);
  const injected = useSyncExternalStore(noopSubscribe, hasInjectedWallet, () => false);
  const detected = wallets.some((w) => w.readyState === "Installed" && w.adapter.name !== "Mobile Wallet Adapter");

  if (mobile && !injected && !detected && !connected) {
    return (
      <button type="button" onClick={openInPhantom} className="btn btn-primary">
        Open in Phantom
      </button>
    );
  }
  return <WalletMultiButton />;
}
