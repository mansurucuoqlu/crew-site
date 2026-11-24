import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import SolanaProvider from "@/components/SolanaProvider";
import Backdrop from "@/components/Backdrop";
import Ticker from "@/components/Ticker";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const rajdhani = Rajdhani({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-rajdhani" });
const techMono = Share_Tech_Mono({ weight: "400", subsets: ["latin"], variable: "--font-techmono" });

export const metadata: Metadata = {
  title: "$CREW",
  description: "No dev. No boss. Just the Crew.",
};

export const viewport: Viewport = {
  themeColor: "#050805",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable} ${techMono.variable}`}>
      <body className="flex flex-col">
        <Backdrop />
        <SolanaProvider>
          <Ticker />
          <Nav />
          <div className="flex-1">{children}</div>
          <Footer />
        </SolanaProvider>
      </body>
    </html>
  );
}
