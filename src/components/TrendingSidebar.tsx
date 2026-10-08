
import { useState, useEffect, useRef } from "react";
import Image from "@/compat/Image";
import Link from "@/compat/Link";
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
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-black tracking-tighter text-white relative inline-block uppercase">
          Top Trending
          <div className="absolute -bottom-2 left-0 w-8 h-1 bg-primary rounded-full transition-colors" />
        </h2>
        <TrendingSelector value={period} onChange={setPeriod} />
      </div>
      
      <div className={`flex flex-col gap-3 bg-black/40 backdrop-blur-md rounded-2xl border border-border shadow-2xl p-3 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        {trendingAnime.length > 0 ? (trendingAnime).slice(0, 10).map((anime: HeroResult, idx: number) => (
          <Link
            href={`/anime/${anime.id}`}
            key={`trending-side-${anime.id}`}
            className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="relative flex items-center gap-4 px-4 py-4">
              <div className="absolute inset-0">
                <Image
                  unoptimized
                  fill
                  sizes="320px"
                  src={anime.cover || anime.image || "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=2000&auto=format&fit=crop"}
                  alt={getAnimeTitle(anime.title)}
                  className="object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500"
                  priority={idx < 2}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/70 to-transparent" />
              </div>

              <div className="relative z-10 w-16 text-center">
                <span className={`text-3xl font-black tracking-tight ${
                  idx === 0 ? 'text-[#ffd700]' : 
                  idx === 1 ? 'text-[#c0c0c0]' : 
                  idx === 2 ? 'text-[#cd7f32]' : 
                  'text-white/20'
                }`}>
                  {idx + 1}
                </span>
              </div>

              <div className="relative z-10 flex flex-col min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white line-clamp-1 leading-snug">
                  {getAnimeTitle(anime.title)}
                </h4>
                <div className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                  {anime.rating && (
                    <span className="flex items-center gap-1 text-amber-400">
                      ★ {(Number(anime.rating) / 10).toFixed(1)}
                    </span>
                  )}
                  <span className="text-white/50">{anime.type || "TV"}</span>
                </div>
              </div>
            </div>
          </Link>
        )) : (
          <p className="py-20 text-center text-white/20 font-medium italic">
            Trending data not available.
          </p>
        )}
      </div>
      
    </section>
  );
}
