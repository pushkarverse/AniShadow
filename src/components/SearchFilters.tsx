"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Filter, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const genres = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mecha", 
  "Music", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", 
  "Sports", "Supernatural", "Thriller"
];

const statuses = [
  { label: "Trending", value: "RELEASING" },
  { label: "Finished", value: "FINISHED" },
  { label: "Upcoming", value: "NOT_YET_RELEASED" },
  { label: "Hiatus", value: "HIATUS" }
];

const formats = ["TV", "MOVIE", "SPECIAL", "OVA", "ONA"];

const seasons = ["WINTER", "SPRING", "SUMMER", "FALL"];

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  // Get current filter values from URL
  const currentGenres = searchParams.get("genres")?.split(",") || [];
  const currentStatus = searchParams.get("status") || "";
  const currentFormat = searchParams.get("format") || "";
  const currentSeason = searchParams.get("season") || "";
  const currentType = searchParams.get("type") || "ANIME";
  const currentQuery = searchParams.get("q") || "";

  const updateFilters = (newFilters: Record<string, string | string[]>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) params.set(key, value.join(","));
        else params.delete(key);
      } else {
        if (value) params.set(key, value);
        else params.delete(key);
      }
    });

    params.set("page", "1"); // Reset to page 1 on filter change
    router.push(`/search?${params.toString()}`);
  };

  const toggleGenre = (genre: string) => {
    const nextGenres = currentGenres.includes(genre)
      ? currentGenres.filter(g => g !== genre)
      : [...currentGenres, genre];
    updateFilters({ genres: nextGenres });
  };

  const clearFilters = () => {
    router.push(`/search${currentQuery ? `?q=${encodeURIComponent(currentQuery)}` : ""}`);
  };

  const activeFilterCount = currentGenres.length + (currentStatus ? 1 : 0) + (currentFormat ? 1 : 0) + (currentSeason ? 1 : 0);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-sm font-bold uppercase tracking-widest group"
        >
          <Filter className={`w-4 h-4 transition-transform ${isOpen ? 'text-primary' : 'text-white/40 group-hover:text-white/60'}`} />
          <span>Advanced Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs font-bold text-white/40 hover:text-primary transition-colors uppercase tracking-[0.2em] flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear All
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Media Type */}
              <div className="lg:col-span-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-4">Discovery Type</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateFilters({ type: "ANIME" })}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      currentType === "ANIME"
                        ? "bg-[#ff4a4a] border-red-500/50 text-white shadow-lg shadow-red-500/20"
                        : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                    }`}
                  >
                    Anime {currentType === "ANIME" && "✓"}
                  </button>
                  <button
                    onClick={() => updateFilters({ type: "MANGA" })}
                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      currentType === "MANGA"
                        ? "bg-[#ff6600] border-orange-500/50 text-white shadow-lg shadow-orange-500/20"
                        : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                    }`}
                  >
                    Manga {currentType === "MANGA" && "✓"}
                  </button>
                </div>
              </div>
              {/* Genres */}
              <div className="lg:col-span-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-4">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {genres.map(genre => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        currentGenres.includes(genre)
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                          : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-4">Status</h3>
                <div className="space-y-2">
                  {statuses.map(status => (
                    <button
                      key={status.value}
                      onClick={() => updateFilters({ status: currentStatus === status.value ? "" : status.value })}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-between group ${
                        currentStatus === status.value
                          ? "bg-primary/20 border-primary text-white"
                          : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                      }`}
                    >
                      {status.label}
                      {currentStatus === status.value && <Check className="w-3 h-3 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format & Season */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-4">Format</h3>
                  <div className="flex flex-wrap gap-2">
                    {formats.map(format => (
                      <button
                        key={format}
                        onClick={() => updateFilters({ format: currentFormat === format ? "" : format })}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                          currentFormat === format
                            ? "bg-white text-[#0a0a0a] border-white"
                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                        }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-4">Season</h3>
                  <div className="flex flex-wrap gap-2">
                    {seasons.map(season => (
                      <button
                        key={season}
                        onClick={() => updateFilters({ season: currentSeason === season ? "" : season })}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                          currentSeason === season
                            ? "bg-accent text-[#0a0a0a] border-accent"
                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                        }`}
                      >
                        {season}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
