"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, X, ChevronLeft, ChevronRight, MonitorPlay, Trash2 } from "lucide-react";

interface HistoryItem {
  animeId: string;
  title: string;
  image: string;
  episodeNumber: number;
  displayEpisodeNumber: number;
  episodeTitle?: string;
  slug?: string;
  watchedAt: string;
}

export function AnimeLibrarySection() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem("anishadow-history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load anime history:", e);
    }
  };

  const removeFromHistory = (animeId: string) => {
    const updated = history.filter((item) => item.animeId !== animeId);
    setHistory(updated);
    localStorage.setItem("anishadow-history", JSON.stringify(updated));
  };

  const checkScrollability = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScrollability();
    el.addEventListener("scroll", checkScrollability);
    window.addEventListener("resize", checkScrollability);
    return () => {
      el.removeEventListener("scroll", checkScrollability);
      window.removeEventListener("resize", checkScrollability);
    };
  }, [history, mounted]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (!mounted) return null;
  if (history.length === 0) return null; // Don't render anything if history is empty

  return (
    <section id="anime-history" className="mb-12 md:mb-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <MonitorPlay className="w-6 h-6 text-primary" />
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">
            Continue Watching
          </h2>
          <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/10">
            {history.length} {history.length === 1 ? "Item" : "Items"}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all disabled:opacity-20 disabled:hover:bg-white/5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all disabled:opacity-20 disabled:hover:bg-white/5 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Fade edges */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollContainerRef}
          className="flex gap-5 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x md:grid md:grid-cols-4 xl:grid-cols-5 md:gap-x-4 md:gap-y-8 md:overflow-visible md:pb-0 md:snap-none"
        >
          {history.map((item, index) => {
            const watchUrl = `/watch/${item.animeId}/${item.slug || "anime"}?ep=${item.episodeNumber}`;

            return (
              <motion.div
                key={item.animeId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative shrink-0 w-[155px] sm:w-[180px] snap-start md:w-full"
              >
                {/* Card */}
                <Link href={watchUrl} className="block">
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-[#121212] border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-primary/50 group-hover:shadow-primary/20 group-hover:-translate-y-1">
                    <Image
                      src={item.image || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=500&auto=format&fit=crop"}
                      alt={item.title}
                      fill
                      sizes="180px"
                      className="object-cover transition-all duration-700 group-hover:scale-105"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Progress Badge */}
                    <div className="absolute bottom-3 left-3 right-3 z-10">
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-primary/90 backdrop-blur-md rounded-xl border border-white/10 shadow-lg shadow-primary/20">
                        <Play className="w-3 h-3 text-white fill-current shrink-0" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest truncate">
                          Ep {item.displayEpisodeNumber}
                        </span>
                      </div>
                    </div>

                  </div>
                </Link>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeFromHistory(item.animeId);
                  }}
                  className="absolute top-2 right-2 z-20 p-1.5 bg-black/70 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 rounded-full opacity-100 transition-all duration-300 hover:scale-110 backdrop-blur cursor-pointer"
                  title="Remove from History"
                >
                  <X className="w-3 h-3 text-white/70 hover:text-red-300" />
                </button>

                {/* Title */}
                <Link href={`/anime/${item.animeId}/${item.slug || "anime"}`} className="block mt-3 px-1">
                  <h4 className="text-xs font-black text-white/80 line-clamp-2 leading-tight group-hover:text-primary transition-colors uppercase italic">
                    {item.title}
                  </h4>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-4 overflow-hidden border-t border-white/5 pt-3">
          <div className="ticker-track text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
            {history.concat(history).map((item, index) => (
              <span key={`${item.animeId}-ticker-${index}`} className="flex items-center gap-2">
                <span className="text-primary">•</span>
                <span className="whitespace-nowrap">{item.title}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
