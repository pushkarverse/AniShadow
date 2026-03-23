import { Navbar } from "@/components/Navbar";
import { MangaCard } from "@/components/MangaCard";
import { MangaTrendingSidebar } from "@/components/MangaTrendingSidebar";
import { getTrendingManga, getPopularManga } from "@/lib/consumet";
import { getAnimeTitle } from "@/lib/anime-utils";
import { BookOpen, TrendingUp, Star } from "lucide-react";
import { Metadata } from "next";

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
        {/* Manga Hero Header */}
        <section className="mb-12 md:mb-16 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-card to-background border border-white/5 p-8 md:p-16">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
            <BookOpen className="w-full h-full rotate-12 scale-150" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-1 bg-primary rounded-full" />
              <span className="text-xs font-black uppercase tracking-[0.4em] text-primary">Discover Library</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-none text-white uppercase italic">
              Manga<span className="text-primary italic">Shadow</span> <br /> Premium Reading
            </h1>
            <p className="text-lg text-white/50 font-medium mb-10 leading-relaxed">
              Explore thousands of high-quality manga titles with our sleek, ad-free reader. 
              From weekly shonen hits to hidden indie gems, your next journey starts here.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                Start Reading
              </button>
              <button className="px-8 py-4 bg-white/5 text-white/70 rounded-2xl font-black uppercase tracking-widest text-sm border border-white/5 hover:bg-white/10 transition-all">
                Library List
              </button>
            </div>
          </div>
        </section>

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
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
                {trendingManga.map((manga: any) => (
                  <MangaCard 
                    key={manga.id} 
                    id={manga.id} 
                    title={getAnimeTitle(manga.title)} 
                    image={manga.image} 
                    rating={manga.rating ? manga.rating / 10 : undefined}
                    countryOfOrigin={manga.countryOfOrigin}
                    chapters={manga.chapters}
                    chapterNumber={manga.chapters}
                    href={`/manga/${manga.id}`}
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
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
                {popularManga.map((manga: any) => (
                  <MangaCard 
                    key={manga.id} 
                    id={manga.id} 
                    title={getAnimeTitle(manga.title)} 
                    image={manga.image} 
                    rating={manga.rating ? manga.rating / 10 : undefined}
                    countryOfOrigin={manga.countryOfOrigin}
                    chapters={manga.chapters}
                    href={`/manga/${manga.id}`}
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
