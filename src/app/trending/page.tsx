import { Navbar } from "@/components/Navbar";
import { AnimeCard } from "@/components/AnimeCard";
import { Pagination } from "@/components/Pagination";
import { getTrendingAnime } from "@/lib/consumet";
import { getAnimeTitle } from "@/lib/anime-utils";
import Link from "next/link";
import type { HeroResult } from "@/types/anime";

export const dynamic = "force-dynamic";

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const { page, filter } = await searchParams;
  const currentPage = parseInt(page || "1");
  const currentFilter = filter || "all";

  let country: string | undefined = undefined;
  if (currentFilter === "japanese") {
    country = "JP";
  } else if (currentFilter === "chinese") {
    country = "CN";
  }

  const trendingData = await getTrendingAnime(currentPage, 24, "NOW", country);
  const trendingAnime = trendingData?.results || [];
  const hasNextPage = trendingData?.hasNextPage || false;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
      <Navbar />

      <main className="flex-1 container mx-auto px-6 md:px-12 pt-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">
              Trending <span className="text-primary">Now</span>
            </h1>
            <div className="h-1 w-24 bg-primary rounded-full shadow-lg shadow-primary/20" />
            <p className="text-foreground/60 max-w-2xl leading-relaxed">
              Stay ahead of the curve with the most watched and discussed anime of the season.
              Experience premium streaming with zero interruptions.
            </p>
          </div>

          {/* Segmented Control Picker */}
          <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-2xl border border-white/5 select-none shrink-0 self-start md:self-end shadow-inner">
            <Link
              href="/trending?filter=all"
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${currentFilter === "all"
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
            >
              All
            </Link>
            <Link
              href="/trending?filter=japanese"
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${currentFilter === "japanese"
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
            >
              Japanese
            </Link>
            <Link
              href="/trending?filter=chinese"
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${currentFilter === "chinese"
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
            >
              Chinese
            </Link>
          </div>
        </div>

        {trendingAnime.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-10">
              {trendingAnime.map((anime: HeroResult) => (
                <AnimeCard
                  key={anime.id}
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
              baseUrl="/trending"
              extraParams={{ filter: currentFilter }}
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
              href={`/trending?page=${currentPage}&filter=${currentFilter}`}
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
