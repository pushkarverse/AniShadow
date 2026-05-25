import { Navbar } from "@/components/Navbar";
import { MangaCard } from "@/components/MangaCard";
import { MangaTrendingSidebar } from "@/components/MangaTrendingSidebar";
import { getTrendingManga, getPopularManga } from "@/lib/consumet";
import { getAnimeTitle } from "@/lib/anime-utils";
import { TrendingUp, Star } from "lucide-react";
import { Metadata } from "next";
import { MangaLibrarySection } from "@/components/MangaLibrarySection";

export const metadata: Metadata = {
  title: "MangaShadow - Premium Manga Reading",
  description: "Explore thousands of high-quality manga titles with our sleek, ad-free reader on MangaShadow.",
};

export default async function MangaPage() {
  const trendingData = await getTrendingManga(1, 20);
  const popularData = await getPopularManga(1, 20);

  const trendingManga = trendingData?.results || [];
  const popularManga = popularData?.results || [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 manga-theme">
      <Navbar />
      
      <main className="container mx-auto px-4 md:px-8 pt-8">
        {/* Library Section */}
        <MangaLibrarySection />

        {/* Categories / Trending */}
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <section className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">
                    Trending Right Now
                  </h2>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-4 gap-y-8">
                {trendingManga.map((manga: any) => (
                  <MangaCard 
                    key={manga.id} 
                    id={manga.id} 
                    title={getAnimeTitle(manga.title)} 
                    slug={manga.slug}
                    image={manga.image} 
                    rating={manga.rating ? manga.rating / 10 : undefined}
                    countryOfOrigin={manga.countryOfOrigin}
                    chapters={manga.chapters}
                    chapterNumber={manga.chapters}
                  />
                ))}
              </div>
            </section>

            <section className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Star className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">
                    All-Time Popular
                  </h2>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-4 gap-y-8">
                {popularManga.map((manga: any) => (
                  <MangaCard 
                    key={manga.id} 
                    id={manga.id} 
                    title={getAnimeTitle(manga.title)} 
                    slug={manga.slug}
                    image={manga.image} 
                    rating={manga.rating ? manga.rating / 10 : undefined}
                    countryOfOrigin={manga.countryOfOrigin}
                    chapters={manga.chapters}
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="w-full lg:w-96 shrink-0">
             <MangaTrendingSidebar initialData={trendingManga} />
          </aside>
        </div>
      </main>
    </div>
  );
}
