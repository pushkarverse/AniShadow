"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { AnimeCard } from "@/components/AnimeCard";
import { MangaCard } from "@/components/MangaCard";
import { Bookmark, LayoutGrid, List, MonitorPlay, BookOpen } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AnimeLibrarySection } from "@/components/AnimeLibrarySection";

export default function WatchlistPage() {
  const [activeTab, setActiveTab] = useState<"anime" | "manga">("anime");
  const [animeWatchlist, setAnimeWatchlist] = useState<any[]>([]);
  const [mangaWatchlist, setMangaWatchlist] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedAnime = localStorage.getItem("anishadow-watchlist");
    if (savedAnime) setAnimeWatchlist(JSON.parse(savedAnime));

    const savedManga = localStorage.getItem("mangashadow-watchlist");
    if (savedManga) setMangaWatchlist(JSON.parse(savedManga));
  }, []);

  useEffect(() => {
    if (activeTab === "manga") {
      document.documentElement.classList.add("reader-theme");
    } else {
      document.documentElement.classList.remove("reader-theme");
    }
  }, [activeTab]);

  const clearWatchlist = () => {
    const type = activeTab === "anime" ? "anime" : "manga";
    if (confirm(`Are you sure you want to clear your entire ${type} list?`)) {
      if (activeTab === "anime") {
        localStorage.removeItem("anishadow-watchlist");
        setAnimeWatchlist([]);
      } else {
        localStorage.removeItem("mangashadow-watchlist");
        setMangaWatchlist([]);
      }
    }
  };

  if (!mounted) return null;

  const currentList = activeTab === "anime" ? animeWatchlist : mangaWatchlist;

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col pb-20 ${activeTab === "manga" ? "reader-theme" : ""}`}>
      <Navbar />
      
      <main className="flex-1 container mx-auto px-6 md:px-12 pt-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-primary">
                    <Bookmark className="w-6 h-6 fill-current" />
                    <span className="text-sm font-bold uppercase tracking-[0.2em]">Personal Collection</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">
                    Your <span className="text-primary">{activeTab === "anime" ? "Watchlist" : "Library"}</span>
                </h1>
                <div className="h-1 w-24 bg-primary rounded-full shadow-lg shadow-primary/20" />
            </div>

            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                <button 
                    onClick={() => setActiveTab("anime")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "anime" ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                    <MonitorPlay className="w-4 h-4" />
                    Anime
                </button>
                <button 
                    onClick={() => setActiveTab("manga")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "manga" ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                    <BookOpen className="w-4 h-4" />
                    Manga
                </button>
            </div>

            {currentList.length > 0 && (
                <button 
                    onClick={clearWatchlist}
                    className="px-6 py-2 rounded-lg border border-white/5 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 transition-all text-sm font-medium"
                >
                    Clear All
                </button>
            )}
        </div>

        {/* Continue Watching Section inside watchlist */}
        {activeTab === "anime" && (
          <div className="mb-12">
            <AnimeLibrarySection />
          </div>
        )}

        <AnimatePresence mode="wait">
            {currentList.length > 0 ? (
                <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 gap-y-10"
                >
                    {activeTab === "anime" ? (
                        animeWatchlist.map((anime: any) => (
                            <AnimeCard 
                                key={anime.animeId} 
                                id={anime.animeId} 
                                title={anime.title} 
                                image={anime.image} 
                                slug={anime.slug}
                            />
                        ))
                    ) : (
                        mangaWatchlist.map((manga: any) => (
                            <MangaCard 
                                key={manga.mangaId} 
                                id={manga.mangaId} 
                                title={manga.title} 
                                image={manga.image} 
                                slug={manga.slug}
                            />
                        ))
                    )}
                </motion.div>
            ) : (
                <motion.div 
                    key={`${activeTab}-empty`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-32 text-center bg-card/40 gold-framed rounded-3xl border border-white/5"
                >
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <Bookmark className="w-10 h-10 text-primary opacity-50" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4 uppercase tracking-widest">Your {activeTab} list is empty</h2>
                    <p className="text-white/40 mb-8 max-w-sm">
                        Start building your ultimate collection by clicking the bookmark icon on any {activeTab} card.
                    </p>
                    <Link 
                        href={activeTab === "anime" ? "/anime" : "/reader"}
                        className="px-8 py-3 bg-primary text-white font-bold rounded-lg border border-accent/20 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        Explore {activeTab === "anime" ? "Trending" : "Library"}
                    </Link>
                </motion.div>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
}
