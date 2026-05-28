"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X, ChevronLeft, ChevronRight, Library, Trash2 } from "lucide-react";

interface WatchlistItem {
  mangaId: string;
  title: string;
  slug: string;
  image: string;
  addedAt: string;
}

interface ProgressItem {
  chapterId: string;
  chapterNumber: string;
  chapterTitle: string;
  readAt: string;
}

export function MangaLibrarySection() {
  const [library, setLibrary] = useState<WatchlistItem[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressItem>>({});
  const [mounted, setMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadLibrary();
  }, []);

  const loadLibrary = () => {
    try {
      const saved = localStorage.getItem("mangashadow-watchlist");
      if (saved) setLibrary(JSON.parse(saved));

      const savedProgress = localStorage.getItem("mangashadow-progress");
      if (savedProgress) setProgressMap(JSON.parse(savedProgress));
    } catch (e) {
      console.error("Failed to load library:", e);
    }
  };

  const removeFromLibrary = (mangaId: string) => {
    const updated = library.filter((item) => item.mangaId !== mangaId);
    setLibrary(updated);
    localStorage.setItem("mangashadow-watchlist", JSON.stringify(updated));
  };

  // Scroll helpers
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
  }, [library, mounted]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (!mounted) return null;

  if (library.length === 0) {
    return (
      <section id="manga-library" className="mb-12 md:mb-16">
        <div className="flex items-center gap-4 mb-8">
          <Library className="w-6 h-6 text-primary" />
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">
            Your Library
          </h2>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 ring-8 ring-primary/5">
            <BookOpen className="w-8 h-8 text-primary opacity-50" />
          </div>
          <h3 className="text-xl font-black uppercase tracking-wider mb-3 text-white/60">No Manga Saved Yet</h3>
          <p className="text-white/30 text-sm max-w-sm mx-auto mb-8 font-medium leading-relaxed">
            Browse trending or popular manga below and click &quot;Add to Library&quot; on any manga detail page to save it here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="manga-library" className="mb-12 md:mb-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Library className="w-6 h-6 text-primary" />
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">
            Your Library
          </h2>
          <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/10">
            {library.length} {library.length === 1 ? "Title" : "Titles"}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all disabled:opacity-20 disabled:hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all disabled:opacity-20 disabled:hover:bg-white/5"
          >
            <ChevronRight className="w-4 h-4" />
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
          className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide scroll-smooth snap-x"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {library.map((item, index) => {
            const progress = progressMap[item.mangaId];
            const readUrl = progress
              ? `/manga/read/${item.mangaId}/${item.slug}/${progress.chapterId}`
              : `/manga/${item.mangaId}/${item.slug}`;

            return (
              <motion.div
                key={item.mangaId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative shrink-0 w-[160px] md:w-[180px] snap-start"
              >
                {/* Card */}
                <Link href={readUrl} className="block">
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-[#121212] border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-primary/50 group-hover:shadow-primary/20 group-hover:-translate-y-1">
                    <Image
                      src={item.image || ""}
                      alt={item.title}
                      fill
                      sizes="180px"
                      className="object-cover transition-all duration-700 group-hover:scale-105"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Progress Badge */}
                    {progress && (
                      <div className="absolute bottom-3 left-3 right-3 z-10">
                        <div className="flex items-center gap-2 px-3 py-2 bg-primary/90 backdrop-blur-md rounded-xl border border-white/10 shadow-lg shadow-primary/20">
                          <BookOpen className="w-3 h-3 text-white shrink-0" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest truncate">
                            Ch. {progress.chapterNumber}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeFromLibrary(item.mangaId);
                  }}
                  className="absolute top-2 right-2 z-20 p-1.5 bg-black/70 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 rounded-full opacity-100 transition-all duration-300 hover:scale-110 backdrop-blur"
                  title="Remove from Library"
                >
                  <X className="w-3 h-3 text-white/70 hover:text-red-300" />
                </button>                

                {/* Title */}
                <Link href={`/manga/${item.mangaId}/${item.slug}`} className="block mt-3 px-1">
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
            {library.concat(library).map((item, index) => (
              <span key={`${item.mangaId}-ticker-${index}`} className="flex items-center gap-2">
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
