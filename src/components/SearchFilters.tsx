"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronDown, Filter } from "lucide-react";

const genres = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mecha", 
  "Music", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", 
  "Sports", "Supernatural", "Thriller"
];

const tags = [
  "Shounen", "Seinen", "Shoujo", "Isekai", "Magic", "School", 
  "Historical", "Gore", "Super Power", "Military", "Mecha", 
  "Demons", "Martial Arts", "Space", "Parody"
];

const statuses = [
  { label: "Trending", value: "RELEASING" },
  { label: "Finished", value: "FINISHED" },
  { label: "Upcoming", value: "NOT_YET_RELEASED" },
  { label: "Hiatus", value: "HIATUS" }
];

const animeFormats = ["TV", "MOVIE", "SPECIAL", "OVA", "ONA"];
const mangaFormats = ["MANGA", "NOVEL", "ONE_SHOT"];

const years = Array.from({ length: 27 }, (_, i) => (2026 - i).toString());

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type") === "MANGA" ? "MANGA" : "ANIME";
  const formats = currentType === "MANGA" ? mangaFormats : animeFormats;

  // Local state for select inputs
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");

  // Sync state with URL on load/change
  useEffect(() => {
    setSelectedGenre(searchParams.get("genres")?.split(",")[0] || "");
    setSelectedTag(searchParams.get("tags")?.split(",")[0] || "");
    setSelectedYear(searchParams.get("year") || "");
    setSelectedStatus(searchParams.get("status") || "");
    setSelectedFormat(searchParams.get("format") || "");
  }, [searchParams]);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (selectedGenre) params.set("genres", selectedGenre);
    else params.delete("genres");

    if (selectedTag) params.set("tags", selectedTag);
    else params.delete("tags");

    if (selectedYear) params.set("year", selectedYear);
    else params.delete("year");

    if (selectedStatus) params.set("status", selectedStatus);
    else params.delete("status");

    if (selectedFormat) params.set("format", selectedFormat);
    else params.delete("format");

    params.set("page", "1"); // Reset to page 1 on new filters
    router.push(`/search?${params.toString()}`);
  };

  const handleReset = () => {
    setSelectedGenre("");
    setSelectedTag("");
    setSelectedYear("");
    setSelectedStatus("");
    setSelectedFormat("");

    const params = new URLSearchParams();
    const currentQuery = searchParams.get("q");
    const currentType = searchParams.get("type");
    if (currentQuery) params.set("q", currentQuery);
    if (currentType) params.set("type", currentType);
    
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="w-full select-none">
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-5 items-end">
        {/* Genres */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-white/50 pl-0.5">Genres</label>
          <div className="relative">
            <select 
              value={selectedGenre} 
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full bg-[#161616] border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white/80 focus:outline-none focus:border-primary appearance-none pr-8 cursor-pointer transition-colors hover:border-white/10"
            >
              <option value="">Select Genres</option>
              {genres.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-white/50 pl-0.5">Tags</label>
          <div className="relative">
            <select 
              value={selectedTag} 
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full bg-[#161616] border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white/80 focus:outline-none focus:border-primary appearance-none pr-8 cursor-pointer transition-colors hover:border-white/10"
            >
              <option value="">Select Tags</option>
              {tags.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Year */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-white/50 pl-0.5">Year</label>
          <div className="relative">
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-[#161616] border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white/80 focus:outline-none focus:border-primary appearance-none pr-8 cursor-pointer transition-colors hover:border-white/10"
            >
              <option value="">Any year</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-white/50 pl-0.5">Status</label>
          <div className="relative">
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[#161616] border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white/80 focus:outline-none focus:border-primary appearance-none pr-8 cursor-pointer transition-colors hover:border-white/10"
            >
              <option value="">Any Status</option>
              {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Format */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-white/50 pl-0.5">Format</label>
          <div className="relative">
            <select 
              value={selectedFormat} 
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full bg-[#161616] border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white/80 focus:outline-none focus:border-primary appearance-none pr-8 cursor-pointer transition-colors hover:border-white/10"
            >
              <option value="">Any Format</option>
              {formats.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Buttons Block */}
        <div className="flex flex-col gap-1.5">
          {/* Label Row */}
          <div className="grid grid-cols-3 text-center text-[10px] font-black uppercase tracking-widest text-white/40 pr-1">
            <span>Apply</span>
            <span>Reset</span>
            <span>Expand</span>
          </div>
          
          {/* Button grid */}
          <div className="grid grid-cols-3 gap-2 w-full">
            <button 
              type="button" 
              onClick={handleApply}
              className="flex items-center justify-center bg-[#1c1c1c] hover:bg-primary hover:text-white border border-white/5 rounded-lg text-white/80 transition-all cursor-pointer h-[38px] active:scale-95 shadow-md"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={handleReset}
              className="flex items-center justify-center bg-[#1c1c1c] hover:bg-white/15 border border-white/5 rounded-lg text-white/80 hover:text-white transition-all cursor-pointer h-[38px] active:scale-95 shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M16 3h5v5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 21H3v-5"/></svg>
            </button>
            <button 
              type="button" 
              className="flex items-center justify-center bg-[#1c1c1c] hover:bg-white/15 border border-white/5 rounded-lg text-white/80 hover:text-white transition-all cursor-pointer h-[38px] active:scale-95 shadow-md"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
