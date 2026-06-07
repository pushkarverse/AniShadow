import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      <main className="container mx-auto px-4 md:px-8 pt-24 text-center">
        <h1 className="text-4xl md:text-6xl font-black mb-6">Ani Shadow</h1>
        <p className="mb-8 text-white/70">Immersive, premium anime and manga experience. Browse anime or open the reader.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/anime" className="px-8 py-4 bg-primary text-white font-bold rounded-xl">Browse Anime</Link>
          <Link href="/reader" className="px-8 py-4 bg-card text-white font-medium rounded-xl">Open Reader</Link>
        </div>
      </main>
    </div>
  );
}
