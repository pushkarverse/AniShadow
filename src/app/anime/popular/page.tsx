import { Navbar } from "@/components/Navbar";
import { AnimeCard } from "@/components/AnimeCard";
import { Pagination } from "@/components/Pagination";
import { getPopularAnime } from "@/lib/consumet";
import { getAnimeTitle } from "@/lib/anime-utils";
import type { HeroResult } from "@/types/anime";

export const dynamic = "force-dynamic";

export default async function PopularPage({
  searchParams,
  baseUrl = "/anime/popular",
}: {
  searchParams: Promise<{ page?: string }>;
  baseUrl?: string;
}) {
  const { page } = await searchParams;
  const currentPage = parseInt(page || "1");
  const popularData = await getPopularAnime(currentPage, 24);
  const popularAnime = popularData?.results || [];
  const hasNextPage = popularData?.hasNextPage || false;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-6 md:px-12 pt-32">
        <div className="flex flex-col gap-4 mb-12">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic">
                All-Time <span className="text-primary">Popular</span>
            </h1>
            <div className="h-1 w-24 bg-primary rounded-full shadow-lg shadow-primary/20" />
            <p className="text-foreground/60 max-w-2xl leading-relaxed">
                Discover the most celebrated masterpieces in anime history. 
                Voted by millions of fans worldwide.
            </p>
        </div>

        {popularAnime.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-10">
              {popularAnime.map((anime: HeroResult, idx: number) => (
                <AnimeCard 
                  key={`popular-${anime.id || idx}`} 
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
            <button 
                className="px-10 py-4 bg-primary text-white font-black rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
                RETRY
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
