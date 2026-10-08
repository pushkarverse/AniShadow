
import { AnimeCard } from "./AnimeCard";
import { getAnimeTitle } from "@/lib/anime-utils";
import Link from "@/compat/Link";

interface LatestSectionProps {
  initialItems: any[];
}

export function LatestSection({ 
  initialItems = []
}: LatestSectionProps) {
  const filteredItems = initialItems;

  return (
    <section className="mb-12 md:mb-24">
      {/* Header Row */}
      <div className="flex flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white relative inline-block uppercase shrink-0">
            Latest
            <div className="absolute -bottom-2 left-0 w-8 h-1 bg-primary rounded-full" />
          </h2>
        </div>

        <Link 
          href="/anime/latest" 
          className="text-[10px] font-black text-white/40 hover:text-primary transition-all uppercase tracking-[0.2em] bg-white/5 px-4 py-2 rounded-lg border border-white/5 shrink-0"
        >
          View All
        </Link>
      </div>

      {/* Grid Container */}
      <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-4 xl:grid-cols-5 md:gap-x-4 md:gap-y-8 no-scrollbar momentum-scroll -mx-4 px-4 md:mx-0 md:px-0">
        {filteredItems.length > 0 ? (
          filteredItems.slice(0, 15).map((anime: any, idx: number) => (
            <AnimeCard
              key={`latest-${anime.id || idx}`}
              id={anime.id}
              title={getAnimeTitle(anime.title)}
              slug={anime.slug}
              image={
                anime.image && anime.image !== ""
                  ? anime.image
                  : "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=500&auto=format&fit=crop"
              }
              rating={anime.rating ? Number(anime.rating) / 10 : undefined}
              episodeNumber={anime.episodeNumber || anime.episodes}
              subEpisodes={anime.subEpisodes}
              dubEpisodes={anime.dubEpisodes}
              type={anime.type || "TV"}
              duration={anime.duration}
              priority={idx < 4}
            />
          ))
        ) : (
          <p className="col-span-full py-20 text-center text-white/20 font-medium italic bg-white/5 rounded-3xl border border-white/5 w-full">
            No active releases available for the selected category.
          </p>
        )}
      </div>
    </section>
  );
}
