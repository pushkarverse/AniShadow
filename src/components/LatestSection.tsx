"use client";

import { useState } from "react";
import { AnimeCard } from "./AnimeCard";
import { getAnimeTitle } from "@/lib/anime-utils";
import Link from "next/link";

interface LatestSectionProps {
  initialItems: any[];
}

type FilterTab = "all" | "japanese" | "chinese";

export function LatestSection({ initialItems = [] }: LatestSectionProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filteredItems = initialItems.filter((anime) => {
    if (activeTab === "japanese") {
      return anime.countryOfOrigin === "JP";
    }
    if (activeTab === "chinese") {
      return anime.countryOfOrigin === "CN";
    }
    return true; // "all"
  });

  return (
    <section className="mb-12 md:mb-24">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white relative inline-block uppercase shrink-0">
            Latest
            <div className="absolute -bottom-2 left-0 w-8 h-1 bg-primary rounded-full" />
          </h2>

          {/* Segmented Control Picker */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 select-none shrink-0">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-primary text-white shadow-lg"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("japanese")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "japanese"
                  ? "bg-primary text-white shadow-lg"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Japanese
            </button>
            <button
              onClick={() => setActiveTab("chinese")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "chinese"
                  ? "bg-primary text-white shadow-lg"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Chinese
            </button>
          </div>
        </div>

        <Link 
          href="/latest" 
          className="text-[10px] font-black text-white/40 hover:text-primary transition-all uppercase tracking-[0.2em] bg-white/5 px-4 py-2 rounded-lg border border-white/5 self-start sm:self-center"
        >
          View All
        </Link>
      </div>

      {/* Grid Container */}
      <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-4 xl:grid-cols-5 md:gap-x-4 md:gap-y-8 no-scrollbar momentum-scroll -mx-4 px-4 md:mx-0 md:px-0">
        {filteredItems.length > 0 ? (
          filteredItems.slice(0, 15).map((anime: any) => (
            <AnimeCard
              key={anime.id}
              id={anime.id}
              title={getAnimeTitle(anime.title)}
              slug={anime.slug}
              image={
                anime.image && anime.image !== ""
                  ? anime.image
                  : "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=500&auto=format&fit=crop"
              }
              rating={anime.rating ? Number(anime.rating) / 10 : undefined}
              episodeNumber={anime.episodeNumber || anime.episodes}
              subEpisodes={anime.subEpisodes}
              dubEpisodes={anime.dubEpisodes}
              type={anime.type || "TV"}
              duration={anime.duration}
            />
          ))
        ) : (
          <p className="col-span-full py-20 text-center text-white/20 font-medium italic bg-white/5 rounded-3xl border border-white/5 w-full">
            No active releases available for the selected category.
          </p>
        )}
      </div>
    </section>
  );
}
