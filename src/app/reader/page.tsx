import { Navbar } from "@/components/Navbar";
import { ReaderCard } from "@/components/ReaderCard";
import { ReaderTrendingSidebar } from "@/components/ReaderTrendingSidebar";
import {
  getTrendingManga,
  getPopularManga,
  getTrendingNovels,
  getPopularNovels,
} from "@/lib/consumet";
import { getAnimeTitle } from "@/lib/anime-utils";
import { TrendingUp, Star } from "lucide-react";
import { Metadata } from "next";
import { ReaderLibrarySection } from "@/components/ReaderLibrarySection";
import { ReaderTabSwitcher } from "@/components/ReaderTabSwitcher";

export const metadata: Metadata = {
  title: "Reader – Manga, Manhwa & Novels",
  description:
    "Explore thousands of manga, manhwa, light novels, and web novels with our sleek, ad-free Reader.",
};

export const dynamic = "force-dynamic";

export default async function ReaderPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolvedParams = await searchParams;
  const activeTab = resolvedParams.tab === "novel" ? "novel" : "manga";

  // Fetch data based on active tab
  const [
    trendingManga,
    popularManga,
    trendingManhwa,
    popularManhwa,
    trendingNovels,
    popularNovels,
  ] = await Promise.all([
    activeTab === "manga" ? getTrendingManga(1, 15, "JP") : Promise.resolve({ results: [] }),
    activeTab === "manga" ? getPopularManga(1, 15, "JP") : Promise.resolve({ results: [] }),
    activeTab === "manga" ? getTrendingManga(1, 15, "KR") : Promise.resolve({ results: [] }),
    activeTab === "manga" ? getPopularManga(1, 15, "KR") : Promise.resolve({ results: [] }),
    activeTab === "novel" ? getTrendingNovels(1, 50) : Promise.resolve({ results: [] }),
    activeTab === "novel" ? getPopularNovels(1, 50) : Promise.resolve({ results: [] }),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 manga-theme">
      <Navbar />

      <main className="container mx-auto px-4 md:px-8 pt-8">
        {/* Library Section */}
        <ReaderLibrarySection />

        {/* Tab Switcher */}
        <ReaderTabSwitcher activeTab={activeTab} />

        {/* ── MANGA TAB ── */}
        {activeTab === "manga" && (
          <div className="flex flex-col lg:flex-row gap-8 overflow-x-hidden">
            <div className="flex-1 min-w-0">
              {/* Manga Section */}
              <section className="mb-16">
                <div className="flex items-center gap-4 mb-8">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">
                      Trending Manga
                    </h2>
                  </div>
                </div>
                <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-3 xl:grid-cols-5 md:gap-x-4 md:gap-y-8 no-scrollbar momentum-scroll -mx-4 px-4 md:mx-0 md:px-0">
                  {trendingManga.results.map((manga: any, idx: number) => (
                    <ReaderCard
                      key={`manga-trending-${manga.id || idx}-${idx}`}
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

              {/* Manhwa Section */}
              <section className="mb-16">
                <div className="flex items-center gap-4 mb-8">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">
                      Trending Manhwa
                    </h2>
                  </div>
                </div>
                <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-3 xl:grid-cols-5 md:gap-x-4 md:gap-y-8 no-scrollbar momentum-scroll -mx-4 px-4 md:mx-0 md:px-0">
                  {trendingManhwa.results.map((manhwa: any, idx: number) => (
                    <ReaderCard
                      key={`manhwa-trending-${manhwa.id || idx}-${idx}`}
                      id={manhwa.id}
                      title={getAnimeTitle(manhwa.title)}
                      slug={manhwa.slug}
                      image={manhwa.image}
                      rating={manhwa.rating ? manhwa.rating / 10 : undefined}
                      countryOfOrigin={manhwa.countryOfOrigin}
                      chapters={manhwa.chapters}
                      chapterNumber={manhwa.chapters}
                    />
                  ))}
                </div>
              </section>
            </div>

            <aside className="hidden lg:block w-full lg:w-96 shrink-0">
              <ReaderTrendingSidebar initialData={trendingManga.results} />
            </aside>
          </div>
        )}

        {/* ── NOVEL TAB ── */}
        {activeTab === "novel" && (() => {
          const trendingLN = trendingNovels.results.filter((n: any) => n.type === "NOVEL").slice(0, 15);
          const trendingWN = trendingNovels.results.filter((n: any) => n.type === "WEBNOVEL").slice(0, 15);
          const popularLN = popularNovels.results.filter((n: any) => n.type === "NOVEL").slice(0, 15);
          const popularWN = popularNovels.results.filter((n: any) => n.type === "WEBNOVEL").slice(0, 15);

          return (
            <div className="flex flex-col lg:flex-row gap-8 overflow-x-hidden">
              <div className="flex-1 min-w-0">

                {/* Trending Light Novels */}
                <section className="mb-16">
                  <div className="flex items-center gap-4 mb-8">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">
                        Trending Light Novels
                      </h2>
                    </div>
                  </div>
                  <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-3 xl:grid-cols-5 md:gap-x-4 md:gap-y-8 no-scrollbar momentum-scroll -mx-4 px-4 md:mx-0 md:px-0">
                    {trendingLN.length > 0 ? trendingLN.map((novel: any, idx: number) => (
                      <ReaderCard
                        key={`trend-ln-${novel.id || idx}-${idx}`}
                        id={novel.id}
                        title={novel.title}
                        slug={novel.slug}
                        image={novel.image}
                        rating={novel.rating ? novel.rating / 10 : undefined}
                        countryOfOrigin={novel.countryOfOrigin}
                        type={novel.type}
                        chapters={novel.chapters}
                        priority={idx < 2}
                      />
                    )) : (
                      <div className="col-span-5 py-10 text-center text-white/30 text-sm italic">No trending light novels found.</div>
                    )}
                  </div>
                </section>

                {/* Trending Web Novels */}
                <section className="mb-16">
                  <div className="flex items-center gap-4 mb-8">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">
                        Trending Web Novels
                      </h2>
                    </div>
                  </div>
                  <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-3 xl:grid-cols-5 md:gap-x-4 md:gap-y-8 no-scrollbar momentum-scroll -mx-4 px-4 md:mx-0 md:px-0">
                    {trendingWN.length > 0 ? trendingWN.map((novel: any, idx: number) => (
                      <ReaderCard
                        key={`trend-wn-${novel.id || idx}-${idx}`}
                        id={novel.id}
                        title={novel.title}
                        slug={novel.slug}
                        image={novel.image}
                        rating={novel.rating ? novel.rating / 10 : undefined}
                        countryOfOrigin={novel.countryOfOrigin}
                        type={novel.type}
                        chapters={novel.chapters}
                        priority={idx < 2}
                      />
                    )) : (
                      <div className="col-span-5 py-10 text-center text-white/30 text-sm italic">No trending web novels found.</div>
                    )}
                  </div>
                </section>

                {/* Popular Light Novels */}
                <section className="mb-16">
                  <div className="flex items-center gap-4 mb-8">
                    <Star className="w-6 h-6 text-primary" />
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">
                        Popular Light Novels
                      </h2>
                    </div>
                  </div>
                  <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-3 xl:grid-cols-5 md:gap-x-4 md:gap-y-8 no-scrollbar momentum-scroll -mx-4 px-4 md:mx-0 md:px-0">
                    {popularLN.length > 0 ? popularLN.map((novel: any, idx: number) => (
                      <ReaderCard
                        key={`pop-ln-${novel.id || idx}-${idx}`}
                        id={novel.id}
                        title={novel.title}
                        slug={novel.slug}
                        image={novel.image}
                        rating={novel.rating ? novel.rating / 10 : undefined}
                        countryOfOrigin={novel.countryOfOrigin}
                        type={novel.type}
                        chapters={novel.chapters}
                        priority={idx < 2}
                      />
                    )) : (
                      <div className="col-span-5 py-10 text-center text-white/30 text-sm italic">No popular light novels found.</div>
                    )}
                  </div>
                </section>

                {/* Popular Web Novels */}
                <section className="mb-16">
                  <div className="flex items-center gap-4 mb-8">
                    <Star className="w-6 h-6 text-primary" />
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase">
                        Popular Web Novels
                      </h2>
                    </div>
                  </div>
                  <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-3 xl:grid-cols-5 md:gap-x-4 md:gap-y-8 no-scrollbar momentum-scroll -mx-4 px-4 md:mx-0 md:px-0">
                    {popularWN.length > 0 ? popularWN.map((novel: any, idx: number) => (
                      <ReaderCard
                        key={`pop-wn-${novel.id || idx}-${idx}`}
                        id={novel.id}
                        title={novel.title}
                        slug={novel.slug}
                        image={novel.image}
                        rating={novel.rating ? novel.rating / 10 : undefined}
                        countryOfOrigin={novel.countryOfOrigin}
                        type={novel.type}
                        chapters={novel.chapters}
                        priority={idx < 2}
                      />
                    )) : (
                      <div className="col-span-5 py-10 text-center text-white/30 text-sm italic">No popular web novels found.</div>
                    )}
                  </div>
                </section>

              </div>

              {/* Sidebar — same as manga tab */}
              <aside className="hidden lg:block w-full lg:w-96 shrink-0">
                <ReaderTrendingSidebar initialData={trendingLN} />
              </aside>
            </div>
          );
        })()}
      </main>
    </div>
  );
}

