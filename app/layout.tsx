import type { Metadata } from "next";
import "./globals.css";
import SolanaProvider from "@/components/SolanaProvider";

export const metadata: Metadata = {
  title: "$CREW",
  description: "No dev. No boss. Just the Crew.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SolanaProvider>{children}</SolanaProvider>
      </body>
    </html>
  );
}