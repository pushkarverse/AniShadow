
import { useEffect, useState } from "react";
import Link from "@/compat/Link";
import { WifiOff, RotateCw, Bookmark, ArrowRight, Home } from "lucide-react";
import { motion } from "framer-motion";
import { AnimeLibrarySection } from "@/components/AnimeLibrarySection";
import Image from "@/compat/Image";

export default function OfflinePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between pb-12">
      {/* Top Header */}
      <header className="w-full px-6 py-6 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 select-none group">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden group-hover:scale-105 transition-transform duration-300 bg-primary">
            <Image
              src="/icon.png"
              alt="AniShadow Icon"
              fill
              sizes="32px"
              className="object-cover"
            />
          </div>
          <span className="font-sans font-black text-white tracking-widest text-sm uppercase italic group-hover:text-primary transition-colors duration-300">
            AniShadow
          </span>
        </Link>
        <span className="text-[10px] font-black uppercase tracking-widest text-red-500/80 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Offline
        </span>
      </header>

      {/* Main Connection Block */}
      <main className="flex-1 container mx-auto px-6 flex flex-col items-center justify-center py-12 max-w-2xl text-center">
        {/* Pulsing Wifi Icon */}
        <div className="relative mb-8">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute inset-0 bg-primary rounded-full blur-2xl -z-10"
          />
          <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden group">
            <WifiOff className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Text Details */}
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic mb-4">
          Connection <span className="text-primary">Shadowed</span>
        </h1>
        <div className="h-1 w-24 bg-primary rounded-full mb-6 shadow-lg shadow-primary/20" />
        <p className="text-foreground/60 leading-relaxed text-sm md:text-base max-w-md mb-8">
          You are currently disconnected from the grid. Don't worry, your offline library and watch history remain active.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-16">
          <button
            onClick={handleRetry}
            className="px-8 py-4 bg-primary hover:bg-primary/95 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCw className="w-4 h-4 animate-spin-slow" />
            Try Reconnecting
          </button>
          
          <Link
            href="/anime/watchlist"
            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Bookmark className="w-4 h-4 text-primary" />
            Open Watchlist
          </Link>
        </div>

        {/* Continue Watching Section (works offline because of localStorage!) */}
        <div className="w-full text-left">
          <AnimeLibrarySection />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-white/20 text-[10px] uppercase tracking-widest select-none">
        AniShadow PWA Offline Engine
      </footer>
    </div>
  );
}
