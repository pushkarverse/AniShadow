import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AnimeCard } from "@/components/AnimeCard";
import { Pagination } from "@/components/Pagination";
import { PageLoader } from "@/components/PageLoader";
import { getAnimeTitle } from "@/lib/anime-utils";
import Link from "@/compat/Link";
import { useSearchParams } from "@/compat/navigation";
import type { HeroResult } from "@/types/anime";

export default function LatestPage() {
  const searchParams = useSearchParams();
  const baseUrl = "/anime/latest";
  const page = searchParams.get("page");
  const currentPage = parseInt(page || "1");

  const [state, setState] = useState<{
    results: any[];
    hasNextPage: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState(null);

    fetch(`/api/anime/list?kind=ongoing&country=JP&page=${currentPage}&perPage=24`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setState({
            results: data.results || [],
            hasNextPage: data.hasNextPage || false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ results: [], hasNextPage: false });
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  if (!state) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
        <Navbar />
        <main className="flex-1 container mx-auto px-6 md:px-12 pt-32">
          <PageLoader />
        </main>
      </div>
    );
  }

  const ongoingAnime = state.results;
  const hasNextPage = state.hasNextPage;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-6 md:px-12 pt-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">
              <span className="text-primary">Latest</span> Anime
            </h1>
            <div className="h-1 w-24 bg-primary rounded-full shadow-lg shadow-primary/20" />
            <p className="text-foreground/60 max-w-2xl leading-relaxed">
              Discover the latest episodes and currently airing anime series.
            </p>
          </div>

        </div>

        {ongoingAnime.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-10">
              {ongoingAnime.map((anime: any, idx: number) => (
                <AnimeCard 
                  key={`latest-${anime.id || idx}`} 
                  id={anime.id} 
                  title={getAnimeTitle(anime.title)} 
                  image={anime.image && anime.image !== "" ? anime.image : "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=500&auto=format&fit=crop"} 
                  rating={anime.rating ? Number(anime.rating) / 10 : undefined} 
                  episodeNumber={anime.episodeNumber}
                  subEpisodes={anime.subEpisodes}
                  dubEpisodes={anime.dubEpisodes}
                  type={anime.type}
                  duration={anime.duration}
                />
              ))}
            </div>
            
            <Pagination 
              currentPage={currentPage} 
              hasNextPage={hasNextPage} 
              baseUrl={baseUrl} 
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white/5 rounded-3xl border border-white/5 mx-auto w-full">
            <h2 className="text-2xl font-black text-primary uppercase tracking-tighter mb-4">Service Throttled</h2>
            <p className="text-white/20 mb-8 max-w-md mx-auto">
              The provider is temporarily rate-limiting our requests or no results found. 
              Please try again in a few moments.
            </p>
            <Link 
              href={`${baseUrl}?page=${currentPage}`}
              className="px-10 py-4 bg-primary text-white font-black rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 uppercase tracking-widest text-sm inline-block"
            >
              RETRY
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
