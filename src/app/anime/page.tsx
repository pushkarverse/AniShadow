import { Navbar } from "@/components/Navbar";
import { Hero, type HeroItem } from "@/components/Hero";
import { AnimeCard } from "@/components/AnimeCard";
import { TrendingSidebar } from "@/components/TrendingSidebar";
import { AnimeLibrarySection } from "@/components/AnimeLibrarySection";
import { LatestSection } from "@/components/LatestSection";
import Link from "next/link";
import { Star } from "lucide-react";
import { getTrendingAnime, getPopularAnime, getOngoingAnime } from "@/lib/consumet";
import { getAnimeTitle } from "@/lib/anime-utils";
import type { HeroResult } from "@/types/anime";
import type { IAnimeResult } from "@consumet/extensions";

export const dynamic = "force-dynamic";

export default async function AnimePage() {
  try {
    let trendingAnime: any[] = [];
    let popularAnime: any[] = [];
    let ongoingAnimeJP: any[] = [];

    try {
      const [trendingData, popularData, ongoingDataJP] = await Promise.all([
        getTrendingAnime(),
        getPopularAnime(),
        getOngoingAnime(1, 24, "JP")
      ]);

      trendingAnime = trendingData?.results || [];
      popularAnime = popularData?.results || [];
      ongoingAnimeJP = ongoingDataJP?.results || [];
    } catch (err) {
      console.error('Anime Page data fetch failed:', err);
    }

    const featuredAnime: HeroItem[] = trendingAnime.slice(0, 10).map((anime: HeroResult) => ({
      id: anime.id,
      title: getAnimeTitle(anime.title),
      description: anime.description?.replace(/<[^>]*>?/gm, '') || "Discover a premium, ad-free streaming experience with the latest trending and legendary anime.",
      image: anime.cover || anime.image || "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=2000&auto=format&fit=crop",
      poster: anime.image || anime.cover || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=500&auto=format&fit=crop",
      genres: anime.genres || ["Action", "Adventure"],
      rating: anime.rating ? (Number(anime.rating) / 10).toFixed(1) : "8.5",
      releaseDate: anime.releaseDate || "2024",
      type: anime.type,
      slug: anime.slug,
      subEpisodes: anime.subEpisodes,
      dubEpisodes: anime.dubEpisodes,
    }));

    return (
      <div className="min-h-screen bg-background text-foreground pb-20">
        <Navbar />

        <main className="container mx-auto px-4 md:px-8 pt-0 md:pt-8 overflow-x-hidden">
          <section className="w-full relative mb-12 md:mb-16 -mx-4 w-[calc(100%+2rem)] md:mx-0 md:w-full">
            <Hero items={featuredAnime} />
          </section>

          <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 px-1 md:px-0">
            <div className="flex-1 min-w-0">
              <AnimeLibrarySection />

              <LatestSection
                initialItems={ongoingAnimeJP}
              />
              <section className="mb-12 md:mb-24">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <Star className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">All-Time Popular</h2>
                  </div>
                  <Link href="/anime/popular" className="text-[10px] font-black text-white/40 hover:text-primary transition-all uppercase tracking-[0.2em] bg-white/5 px-4 py-2 rounded-lg border border-white/5">View All</Link>
                </div>

                <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-4 xl:grid-cols-5 md:gap-x-4 md:gap-y-8 no-scrollbar momentum-scroll -mx-4 px-4 md:mx-0 md:px-0">
                  {popularAnime.length > 0 ? popularAnime.slice(0, 15).map((anime: any, idx: number) => (
                    <AnimeCard
                      key={`popular-${anime.id || idx}`}
                      id={anime.id}
                      title={getAnimeTitle(anime.title)}
                      slug={anime.slug}
                      image={anime.image && anime.image !== "" ? anime.image : "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=500&auto=format&fit=crop"}
                      rating={anime.rating ? Number(anime.rating) / 10 : undefined}
                      episodeNumber={anime.episodeNumber || anime.episodes}
                      subEpisodes={anime.subEpisodes}
                      dubEpisodes={anime.dubEpisodes}
                      type={anime.type || "TV"}
                      duration={anime.duration}
                    />
                  )) : (
                    <p className="col-span-full py-20 text-center text-white/20 font-medium italic bg-white/5 rounded-3xl border border-white/5 w-full">
                      Temporarily unavailable due to high traffic. Please try again in a few moments.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <div className="hidden lg:block w-full lg:w-[320px] xl:w-[380px] shrink-0">
              <TrendingSidebar initialData={trendingAnime as HeroResult[]} />
            </div>
          </div>
        </main>
      </div>
    );
  } catch (err: any) {
    return (
      <div className="min-h-screen bg-[#050505] text-red-500 font-mono p-8 flex flex-col justify-center items-center">
        <div className="max-w-3xl w-full bg-red-950/20 border border-red-500/20 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            Anime Page SSR Crash:
          </h1>
          <pre className="text-xs overflow-x-auto bg-black/50 p-4 rounded-xl border border-white/5 text-red-400 whitespace-pre-wrap">
            {err.stack || err.message || err.toString()}
          </pre>
        </div>
      </div>
    );
  }
}
