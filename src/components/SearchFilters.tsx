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
    const params = new URLSearchParams();
    if (currentQuery) params.set("q", currentQuery);
    if (currentType) params.set("type", currentType);
    const queryString = params.toString();
    router.push(`/search${queryString ? `?${queryString}` : ""}`);
  };

  const activeFilterCount = currentGenres.length + (currentStatus ? 1 : 0) + (currentFormat ? 1 : 0) + (currentSeason ? 1 : 0);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
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
          <>
            {/* Desktop Panel */}
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden hidden md:block"
            >
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-6">
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

            {/* Mobile Sheet Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black z-50 md:hidden backdrop-blur-sm"
            />

            {/* Mobile Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.1, bottom: 0.8 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) {
                  setIsOpen(false);
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c0c] border-t border-white/10 rounded-t-3xl md:hidden overflow-hidden flex flex-col max-h-[85vh] shadow-2xl"
            >
              {/* Notch / Drag Bar */}
              <div className="flex items-center justify-center py-4 border-b border-white/5 shrink-0 relative">
                <div className="w-12 h-1 bg-white/20 rounded-full cursor-grab active:cursor-grabbing" />
                <h3 className="absolute left-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                  Refine Discovery
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute right-4 p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Scrollable Filters Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-12">
                {/* Media Type */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">Discovery Type</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateFilters({ type: "ANIME" })}
                      className={`px-4 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        currentType === "ANIME"
                          ? "bg-[#ff4a4a] border-red-500/50 text-white shadow-lg shadow-red-500/20"
                          : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                      }`}
                    >
                      Anime {currentType === "ANIME" && "✓"}
                    </button>
                    <button
                      onClick={() => updateFilters({ type: "MANGA" })}
                      className={`px-4 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
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
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {genres.map(genre => (
                      <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
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
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">Status</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {statuses.map(status => (
                      <button
                        key={status.value}
                        onClick={() => updateFilters({ status: currentStatus === status.value ? "" : status.value })}
                        className={`px-4 py-3.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-between group ${
                          currentStatus === status.value
                            ? "bg-primary/20 border-primary text-white"
                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                        }`}
                      >
                        {status.label}
                        {currentStatus === status.value && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">Format</h3>
                  <div className="flex flex-wrap gap-2">
                    {formats.map(format => (
                      <button
                        key={format}
                        onClick={() => updateFilters({ format: currentFormat === format ? "" : format })}
                        className={`px-3.5 py-2.5 rounded-xl text-[10px] font-black transition-all border ${
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

                {/* Season */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-3">Season</h3>
                  <div className="flex flex-wrap gap-2">
                    {seasons.map(season => (
                      <button
                        key={season}
                        onClick={() => updateFilters({ season: currentSeason === season ? "" : season })}
                        className={`px-3.5 py-2.5 rounded-xl text-[10px] font-black transition-all border ${
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

              {/* Action Button Bar */}
              <div className="p-4 border-t border-white/5 bg-black/40 flex gap-3 shrink-0">
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => {
                      clearFilters();
                      setIsOpen(false);
                    }}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-4 bg-primary hover:bg-primary/95 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-primary/20 cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
