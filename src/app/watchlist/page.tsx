"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { AnimeCard } from "@/components/AnimeCard";
import { Bookmark, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("anishadow-watchlist");
    if (saved) {
      setWatchlist(JSON.parse(saved));
    }
  }, []);

  const clearWatchlist = () => {
    if (confirm("Are you sure you want to clear your entire watchlist?")) {
      localStorage.removeItem("anishadow-watchlist");
      setWatchlist([]);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-6 md:px-12 pt-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-primary">
                    <Bookmark className="w-6 h-6 fill-current" />
                    <span className="text-sm font-bold uppercase tracking-[0.2em]">Personal Collection</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">
                    Your <span className="text-primary">Watchlist</span>
                </h1>
                <div className="h-1 w-24 bg-primary rounded-full shadow-lg shadow-primary/20" />
            </div>

            {watchlist.length > 0 && (
                <button 
                    onClick={clearWatchlist}
                    className="px-6 py-2 rounded-lg border border-white/5 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 transition-all text-sm font-medium"
                >
                    Clear All
                </button>
            )}
        </div>

        <AnimatePresence mode="wait">
            {watchlist.length > 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 gap-y-10"
                >
                    {watchlist.map((anime: any) => (
                        <AnimeCard 
                            key={anime.animeId} 
                            id={anime.animeId} 
                            title={anime.title} 
                            image={anime.image} 
                        />
                    ))}
                </motion.div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-32 text-center bg-card/40 gold-framed rounded-3xl border border-white/5"
                >
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <Bookmark className="w-10 h-10 text-primary opacity-50" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4 uppercase tracking-widest">Your list is empty</h2>
                    <p className="text-white/40 mb-8 max-w-sm">
                        Start building your ultimate collection by clicking the bookmark icon on any anime card.
                    </p>
                    <Link 
                        href="/"
                        className="px-8 py-3 bg-primary text-white font-bold rounded-lg border border-accent/20 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        Explore Trending
                    </Link>
                </motion.div>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
}
