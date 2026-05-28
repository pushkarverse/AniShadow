import { Navbar } from "@/components/Navbar";
import { AnimeCard } from "@/components/AnimeCard";
import { MangaCard } from "@/components/MangaCard";
import { SearchFilters } from "@/components/SearchFilters";
import { Pagination } from "@/components/Pagination";
import { advancedSearchAnime } from "@/lib/consumet";
import { getAnimeTitle } from "@/lib/anime-utils";
import type { IAnimeResult } from "@consumet/extensions";
import { Search as SearchIcon } from "lucide-react";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    q?: string; 
    page?: string; 
    genres?: string; 
    tags?: string;
    status?: string; 
    season?: string; 
    format?: string;
    type?: string;
    year?: string;
  }>;
}) {
  const { q, page, genres, tags, status, season, format, type, year } = await searchParams;
  const query = q || "";
  const currentPage = page ? parseInt(page) : 1;
  const selectedGenres = genres ? genres.split(",") : undefined;
  const selectedTags = tags ? tags.split(",") : undefined;
  const currentYear = year ? parseInt(year) : undefined;
  const currentType = (type === "MANGA" ? "MANGA" : "ANIME") as "ANIME" | "MANGA";

  let searchResults: any[] = [];
  let hasNextPage = false;
  let totalResults = 0;

  // Fetch results if there's a query OR any filters selected
  const hasFilters = genres || tags || status || season || format || year || type;
  
  if (query || hasFilters) {
    const data = await advancedSearchAnime({
      query,
      page: currentPage,
      genres: selectedGenres,
      tags: selectedTags,
      status,
      season,
      year: currentYear,
      format,
      type: currentType
    });
    
    if (data) {
      searchResults = (data.results || []) as IAnimeResult[];
      hasNextPage = data.hasNextPage || false;
      totalResults = data.total || 0;
    }
  }

  return (
    <div className="min-h-screen bg-[#070707] text-foreground flex flex-col pb-24">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 md:px-8 pt-24 md:pt-32 max-w-6xl">
        {/* Title */}
        <div className="flex flex-col gap-1 mb-5">
          <h1 className="text-lg font-black text-white uppercase tracking-wider pl-0.5">
            Search {currentType === "MANGA" ? "Manga" : "Anime"}
          </h1>
        </div>

        {/* Search Compact Input */}
        <div className="w-full">
          <form action="/search" method="GET" className="mb-5 relative w-full group">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/40 group-hover:text-white/60 pointer-events-none transition-colors" />
            <input 
              type="text" 
              name="q"
              defaultValue={query}
              placeholder="Type to search..."
              className="w-full bg-[#121212] border border-white/5 rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 transition-all shadow-xl"
            />
            
            {/* Maintain filter state on search */}
            {genres && <input type="hidden" name="genres" value={genres} />}
            {tags && <input type="hidden" name="tags" value={tags} />}
            {status && <input type="hidden" name="status" value={status} />}
            {season && <input type="hidden" name="season" value={season} />}
            {year && <input type="hidden" name="year" value={year} />}
            {format && <input type="hidden" name="format" value={format} />}
            <input type="hidden" name="type" value={currentType} />
          </form>

          {/* Direct search page filters layout */}
          <SearchFilters />
        </div>

        {(query || hasFilters) && searchResults.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-white/5 max-w-3xl mx-auto shadow-2xl">
            <h2 className="text-2xl font-black text-accent mb-3 uppercase tracking-wider italic">No Masterpieces Found</h2>
            <p className="text-white/40 mb-8 leading-relaxed max-w-md mx-auto text-sm">
              Your search for &quot;{query || "these filters"}&quot; didn&apos;t return any results. 
              Try adjusted parameters or check your spelling.
            </p>
            <Link 
              href="/search"
              className="px-8 py-3 bg-primary text-white font-black uppercase tracking-wider rounded-xl hover:bg-primary/95 transition-all shadow-lg inline-block text-xs"
            >
              Reset Discovery
            </Link>
          </div>
        ) : (
          <>
            {searchResults.length > 0 && (
              <>
                {/* Results count indicator */}
                <div className="mb-6 text-xs text-sky-400 font-bold font-mono pl-1 tracking-wide">
                  {totalResults.toLocaleString()} results found
                </div>

                {/* Cards grid */}
                <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 ${currentType === "MANGA" ? "manga-theme" : ""}`}>
                  {searchResults.map((anime) => {
                    const Card = currentType === "MANGA" ? MangaCard : AnimeCard;
                    return (
                      <Card
                        key={anime.id}
                        id={anime.id}
                        variant="search"
                        title={getAnimeTitle(anime.title)}
                        image={anime.image && anime.image !== "" ? anime.image : "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=500&auto=format&fit=crop"}
                        rating={anime.rating ? anime.rating / 10 : undefined}
                        type={currentType}
                        slug={anime.slug}
                        {...(currentType === "MANGA" ? { 
                          chapterNumber: (anime as any).episodeNumber,
                          countryOfOrigin: (anime as any).countryOfOrigin,
                          chapters: (anime as any).episodeNumber
                        } : {
                          episodeNumber: (anime as any).episodeNumber,
                          subEpisodes: (anime as any).subEpisodes,
                          dubEpisodes: (anime as any).dubEpisodes
                        })}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {searchResults.length > 0 && (
              <div className="mt-12">
                <Pagination 
                  currentPage={currentPage} 
                  hasNextPage={hasNextPage} 
                  baseUrl="/search" 
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
