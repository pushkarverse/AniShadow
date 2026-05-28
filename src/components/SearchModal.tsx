"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight, Play, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { slugify, getAnimeTitle } from "@/lib/anime-utils";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMangaRoute?: boolean;
}

interface SearchResultItem {
  id: string;
  title: string | { english?: string; romaji?: string; userPreferred?: string; native?: string };
  slug?: string;
  image: string;
  type: string;
  status?: string;
  year?: number;
}

function getDisplayTitle(title: any): string {
  if (!title) return "Unknown";
  if (typeof title === "string") return title;
  return title.english || title.romaji || title.userPreferred || title.native || "Unknown";
}

function formatStatus(status?: string): string {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SearchModal({ isOpen, onClose, isMangaRoute = false }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setFocusedIndex(-1);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Debounced Search API call
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const typeParam = isMangaRoute ? "MANGA" : "ANIME";
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&type=${typeParam}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error("Search modal error:", err);
        setResults([]);
      } finally {
        setLoading(false);
        setFocusedIndex(-1);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, isMangaRoute]);

  // Keyboard navigation & actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const itemsLength = results.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1 >= itemsLength ? 0 : prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 < 0 ? itemsLength - 1 : prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIndex >= 0) {
          const anime = results[focusedIndex];
          if (anime) {
            const slug = anime.slug || slugify(getDisplayTitle(anime.title));
            const dest = isMangaRoute ? `/manga/${anime.id}/${slug}` : `/watch/${anime.id}/${slug}?ep=1`;
            router.push(dest);
            onClose();
          }
        } else if (query.trim()) {
          // If no specific item focused, navigate to main search page
          const typeParam = isMangaRoute ? "&type=MANGA" : "";
          router.push(`/search?q=${encodeURIComponent(query.trim())}${typeParam}`);
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedIndex, results, query, isMangaRoute, router, onClose]);

  // Scroll focused element into view
  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [focusedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-24 md:pt-32 px-4">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#060608]/75 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="w-full max-w-2xl bg-[#0c0e14]/90 border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-2xl rounded-3xl overflow-hidden flex flex-col z-[1001]"
          >
            {/* Quick Access Shortcut info bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 select-none bg-white/[0.01]">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/40">
                For quick access : 
                <kbd className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 font-sans font-black shadow-inner">CTRL</kbd> 
                + 
                <kbd className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 font-sans font-black shadow-inner">S</kbd>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/5 text-white/30 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Wrapper */}
            <div className="p-6 pb-4 relative">
              <div className="absolute inset-y-0 left-10 flex items-center pointer-events-none text-white/20">
                <Search className="w-5 h-5" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isMangaRoute ? "Search Manga..." : "Search Anime..."}
                className="w-full bg-[#131620]/80 text-white border border-white/5 rounded-2xl h-13 pl-12 pr-6 text-sm focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all font-sans placeholder-white/20 shadow-inner"
              />
            </div>

            {/* Content List Area */}
            <div className="px-6 pb-6 max-h-[380px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
              {loading ? (
                // Loading Skeleton rows
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4 animate-pulse h-20"
                    >
                      <div className="w-10 h-14 bg-white/5 rounded-lg shrink-0" />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="h-4 bg-white/5 rounded w-1/2" />
                        <div className="h-3 bg-white/5 rounded w-1/4" />
                      </div>
                    </div>
                  ))
              ) : query.trim() === "" ? (
                <div className="py-14 text-center text-white/20 select-none">
                  {isMangaRoute ? (
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  ) : (
                    <Play className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  )}
                  <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">
                    Type to search {isMangaRoute ? "manga series..." : "anime series..."}
                  </p>
                </div>
              ) : results.length > 0 ? (
                results.map((anime, idx) => {
                  const isFocused = idx === focusedIndex;
                  const slug = anime.slug || slugify(getDisplayTitle(anime.title));
                  const dest = isMangaRoute ? `/manga/${anime.id}/${slug}` : `/watch/${anime.id}/${slug}?ep=1`;
                  return (
                    <a
                      key={anime.id}
                      href={dest}
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(dest);
                        onClose();
                      }}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all duration-300 group cursor-pointer ${
                        isFocused
                          ? "bg-white/5 border-primary/40 shadow-inner scale-[1.01]"
                          : "bg-[#11131c]/40 border-white/5 hover:bg-white/5 hover:border-primary/20"
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative w-11 h-15 rounded-xl overflow-hidden border border-white/5 shrink-0 bg-white/5 shadow-md">
                          <Image
                            src={
                              anime.image && anime.image !== ""
                                ? anime.image
                                : "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=500&auto=format&fit=crop"
                            }
                            alt={getDisplayTitle(anime.title)}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex flex-col gap-1.5">
                          <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors leading-tight truncate">
                            {getDisplayTitle(anime.title)}
                          </h4>
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate">
                            {anime.type} &bull; {formatStatus(anime.status)} &bull; {anime.year || "N/A"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-all ${
                          isFocused
                            ? "text-primary translate-x-0.5"
                            : "text-white/20 group-hover:text-primary group-hover:translate-x-0.5"
                        }`}
                      />
                    </a>
                  );
                })
              ) : (
                <div className="py-14 text-center text-white/20 select-none">
                  <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">
                    No results found for &quot;{query}&quot;
                  </p>
                </div>
              )}
            </div>

            {/* Footer tips bar */}
            {results.length > 0 && (
              <div className="px-6 py-3 bg-white/[0.01] border-t border-white/5 text-[9px] font-black uppercase tracking-wider text-white/20 flex items-center justify-between select-none">
                <span>↑↓ navigate &bull; enter select</span>
                <span 
                  onClick={() => {
                    const typeParam = isMangaRoute ? "&type=MANGA" : "";
                    router.push(`/search?q=${encodeURIComponent(query.trim())}${typeParam}`);
                    onClose();
                  }}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  View all results &rarr;
                </span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
