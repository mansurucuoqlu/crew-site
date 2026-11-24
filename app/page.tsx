import Link from "next/link";
import ConnectButton from "@/components/ConnectButton";
import HolderStatus from "@/components/HolderStatus";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-black text-white">
      <h1 className="text-5xl font-bold">$CREW</h1>
      <p className="text-lg text-gray-400">No dev. No boss. Just the Crew.</p>
      <ConnectButton />
      <HolderStatus />
      <div className="flex gap-4">
        <Link href="/contest" className="p-3 rounded bg-purple-600 font-bold">
          Meme contest
        </Link>
        <Link href="/treasury" className="p-3 rounded border border-purple-600 font-bold">
          Treasury
        </Link>
      </div>
    </main>
  );
}