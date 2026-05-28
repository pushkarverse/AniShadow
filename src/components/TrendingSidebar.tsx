"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { TrendingSelector, type TrendingPeriod } from "./TrendingSelector";
import { getAnimeTitle } from "@/lib/anime-utils";
import type { HeroResult } from "@/types/anime";

interface TrendingSidebarProps {
  initialData: HeroResult[];
}

export function TrendingSidebar({ initialData }: TrendingSidebarProps) {
  const [period, setPeriod] = useState<TrendingPeriod>("NOW");
  const [trendingAnime, setTrendingAnime] = useState<HeroResult[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }

    const fetchTrending = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/trending?period=${period}&perPage=10`);
        if (res.ok) {
          const data = await res.json();
          setTrendingAnime(data.results || []);
        }
      } catch (error) {
        console.error("Failed to fetch trending:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();
  }, [period]);

  return (
    <section className="sticky top-8 mb-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl md:text-2xl font-black tracking-tighter text-white relative inline-block uppercase">
          Top Trending
          <div className="absolute -bottom-2 left-0 w-8 h-1 bg-primary rounded-full transition-colors" />
        </h2>
        <TrendingSelector value={period} onChange={setPeriod} />
      </div>
      
      <div className={`flex flex-col bg-[#0a0a0a] rounded-2xl border border-white/5 shadow-2xl overflow-hidden transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        {trendingAnime.length > 0 ? (trendingAnime).slice(0, 10).map((anime: HeroResult, idx: number) => (
          <Link href={`/anime/${anime.id}`} key={`trending-side-${anime.id}`} className={`flex gap-4 items-center group hover:bg-white/5 p-4 transition-colors ${idx !== 0 ? 'border-t border-white/5' : ''}`}>
            <div className={`w-8 text-center text-xl sm:text-2xl font-black ${idx < 3 ? 'text-primary' : 'text-white/40 group-hover:text-white/80'} transition-colors`}>
              {(idx + 1).toString().padStart(2, '0')}
            </div>
            <div className="w-[60px] h-[85px] rounded-lg overflow-hidden relative shadow-lg shrink-0">
              <Image unoptimized fill sizes="60px" src={anime.image || anime.cover || ""} alt={getAnimeTitle(anime.title)} className="object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div className="flex flex-col flex-1 min-w-0 pr-2">
              <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-1.5">{getAnimeTitle(anime.title)}</h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] text-white/50 font-bold bg-white/5 py-0.5 px-1.5 rounded uppercase tracking-wider">{anime.type || "TV"}</span>
                {anime.rating && (
                  <span className="flex items-center text-[9px] text-amber-500 font-bold py-0.5 px-1.5 rounded uppercase tracking-wider bg-amber-500/10">
                    ★ {(Number(anime.rating) / 10).toFixed(1)}
                  </span>
                )}

              </div>
            </div>
          </Link>
        )) : (
          <p className="py-20 text-center text-white/20 font-medium italic">
            Trending data not available.
          </p>
        )}
      </div>
      
      <Link href="/trending" className="mt-4 w-full block text-center text-[10px] font-black text-white/40 hover:text-white transition-all uppercase tracking-[0.2em] bg-white/5 hover:bg-white/10 py-4 rounded-2xl border border-white/5">
        View Top 50
      </Link>
    </section>
  );
}
