"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight } from "lucide-react";
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#060608]/75 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Content Wrapper - Vertically & Horizontally Centered */}
          <div className="relative w-full max-w-2xl z-[1001] flex flex-col gap-2">
            {/* Quick Access Shortcut info bar - Outside the main box */}
            <div className="flex items-center justify-between px-2 select-none w-full">
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

            {/* Main Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full bg-[#131620] border border-[#1f2330] rounded-2xl overflow-hidden flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
            >
              {/* Tabs Row */}
              <div className="flex border-b border-[#1f2330] select-none bg-[#131620]">
                <div className="py-3.5 px-6 font-bold uppercase tracking-wider text-xs text-primary border-b-2 border-primary">
                  {isMangaRoute ? "Manga" : "Anime"}
                </div>
              </div>

              {/* Input Wrapper */}
              <div className="relative bg-[#131620] border-b border-[#1f2330]/40">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isMangaRoute ? "Search Manga..." : "Search Anime..."}
                  className="w-full bg-transparent text-white border-0 px-6 py-4 outline-none font-sans text-sm placeholder-white/20"
                />
              </div>

              {/* Results List Section - Only visible when text is entered */}
              {query.trim() !== "" && (
                <div className="border-r-4 border-primary max-h-[360px] overflow-y-auto custom-scrollbar flex flex-col bg-[#131620]">
                  {loading ? (
                    // Rotating spinner circle
                    <div className="py-14 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
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
                          className={`px-6 py-4 flex items-center justify-between transition-all duration-200 group border-b border-[#1f2330]/50 last:border-b-0 cursor-pointer ${
                            isFocused ? "bg-[#1d2232]" : "hover:bg-[#181c29]"
                          }`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0 shadow-md bg-white/5 border border-white/5">
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
                            <div className="min-w-0 flex flex-col gap-1">
                              <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                                {getDisplayTitle(anime.title)}
                              </h4>
                              <p className="text-xs text-white/40 font-semibold tracking-wide">
                                {anime.type} &bull; {formatStatus(anime.status)} &bull; {anime.year || "N/A"}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
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
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* Scoped Scrollbar styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-primary);
          border-radius: 10px;
        }
      `}} />
    </AnimatePresence>
  );
}
