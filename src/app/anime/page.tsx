import { Navbar } from "@/components/Navbar";
import { AnimeCard } from "@/components/AnimeCard";
import { TrendingSidebar } from "@/components/TrendingSidebar";
import { AnimeLibrarySection } from "@/components/AnimeLibrarySection";
import { LatestSection } from "@/components/LatestSection";
import { getTrendingAnime, getPopularAnime, getOngoingAnime } from "@/lib/consumet";
import { getAnimeTitle } from "@/lib/anime-utils";
import { TrendingUp, Star } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AnimePage() {
  const trendingData = await getTrendingAnime(1, 20);
  const popularData = await getPopularAnime(1, 20);
  const ongoingData = await getOngoingAnime(1, 24, "JP");

  const trendingAnime = trendingData?.results || [];
  const popularAnime = popularData?.results || [];
  const ongoingAnime = ongoingData?.results || [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />
      <main className="container mx-auto px-4 md:px-8 pt-8">
        <AnimeLibrarySection />

        <div className="flex flex-col lg:flex-row gap-8 overflow-x-hidden">
          <div className="flex-1 min-w-0">
            <section className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">Trending Right Now</h2>
                </div>
              </div>

              <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-4 xl:grid-cols-5 md:gap-x-4 md:gap-y-8 no-scrollbar momentum-scroll -mx-4 px-4 md:mx-0 md:px-0">
                {trendingAnime.map((anime: any, idx: number) => (
                  <AnimeCard
                    key={`trending-${anime.id || idx}`}
                    id={anime.id}
                    title={getAnimeTitle(anime.title)}
                    slug={anime.slug}
                    image={anime.image || anime.cover}
                    rating={anime.rating ? Number(anime.rating) / 10 : undefined}
                    episodeNumber={anime.episodeNumber || anime.episodes}
                    subEpisodes={anime.subEpisodes}
                    dubEpisodes={anime.dubEpisodes}
                    type={anime.type || "TV"}
                    duration={anime.duration}
                  />
                ))}
              </div>
            </section>

            <section className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Star className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">All-Time Popular</h2>
                </div>
                <Link href="/anime" className="text-[10px] font-black text-white/40 hover:text-primary transition-all uppercase tracking-[0.2em] bg-white/5 px-4 py-2 rounded-lg border border-white/5">View All</Link>
              </div>

              <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-4 xl:grid-cols-5 md:gap-x-4 md:gap-y-8 no-scrollbar momentum-scroll -mx-4 px-4 md:mx-0 md:px-0">
                {popularAnime.map((anime: any, idx: number) => (
                  <AnimeCard
                    key={`popular-${anime.id || idx}`}
                    id={anime.id}
                    title={getAnimeTitle(anime.title)}
                    slug={anime.slug}
                    image={anime.image || anime.cover}
                    rating={anime.rating ? Number(anime.rating) / 10 : undefined}
                    episodeNumber={anime.episodeNumber || anime.episodes}
                    subEpisodes={anime.subEpisodes}
                    dubEpisodes={anime.dubEpisodes}
                    type={anime.type || "TV"}
                    duration={anime.duration}
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="hidden lg:block w-full lg:w-96 shrink-0">
            <TrendingSidebar initialData={trendingAnime} />
          </aside>
        </div>
      </main>
    </div>
  );
}
