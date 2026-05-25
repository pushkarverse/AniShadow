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
    status?: string; 
    season?: string; 
    format?: string;
    type?: string;
  }>;
}) {
  const { q, page, genres, status, season, format, type } = await searchParams;
  const query = q || "";
  const currentPage = page ? parseInt(page) : 1;
  const selectedGenres = genres ? genres.split(",") : undefined;
  const currentType = (type === "MANGA" ? "MANGA" : "ANIME") as "ANIME" | "MANGA";

  let searchResults: any[] = [];
  let hasNextPage = false;

  // Fetch results if there's a query OR any filters selected
  const hasFilters = genres || status || season || format || type;
  
  if (query || hasFilters) {
    const data = await advancedSearchAnime({
      query,
      page: currentPage,
      genres: selectedGenres,
      status,
      season,
      format,
      type: currentType
    });
    
    if (data && data.results) {
      searchResults = data.results as IAnimeResult[];
      hasNextPage = data.hasNextPage || false;
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-20">
      <Navbar />

      <main className="flex-1 container mx-auto px-6 md:px-12 pt-32">
        <div className="flex flex-col gap-6 mb-12">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic flex items-center gap-4">
                <SearchIcon className="w-10 h-10 md:w-16 md:h-16 text-primary" />
                Discovery
            </h1>
            <div className="h-1.5 w-32 bg-primary rounded-full shadow-lg shadow-primary/20" />
            <p className="text-foreground/60 max-w-2xl leading-relaxed text-lg italic">
                {query ? `Refining results for "${query}"` : "Explore our vast library of premium anime content."}
            </p>
        </div>

        <div className="max-w-5xl">
          <form action="/search" method="GET" className="mb-6 relative group">
              <input 
                  type="text" 
                  name="q"
                  defaultValue={query}
                  placeholder="Type anything to search..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-6 text-xl md:text-2xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-2xl shadow-black/40 group-hover:border-white/20"
              />
              
              {/* Keep hidden filter inputs to maintain state on search */}
              {genres && <input type="hidden" name="genres" value={genres} />}
              {status && <input type="hidden" name="status" value={status} />}
              {season && <input type="hidden" name="season" value={season} />}
              {format && <input type="hidden" name="format" value={format} />}
              <input type="hidden" name="type" value={currentType} />

              <button 
                  type="submit" 
                  className="absolute right-4 top-4 bottom-4 bg-primary text-white px-8 rounded-xl font-black uppercase tracking-[0.25em] text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                  Find
              </button>
          </form>

          <SearchFilters />
        </div>

        {(query || hasFilters) && searchResults.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-3xl gold-framed shadow-2xl shadow-black/60 max-w-4xl mx-auto border border-white/5">
            <h2 className="text-3xl font-black text-accent mb-4 uppercase tracking-[0.2em] italic">No Masterpieces Found</h2>
            <p className="text-white/40 mb-10 leading-relaxed max-w-lg mx-auto font-medium">
              Your search for &quot;{query || "these filters"}&quot; didn&apos;t return any results. 
              Try adjusted parameters or check your spelling.
            </p>
            <Link 
              href="/search"
              className="px-12 py-4 bg-primary text-white font-black uppercase tracking-[0.3em] rounded-xl border border-accent/30 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 inline-block"
            >
              Reset Discovery
            </Link>
          </div>
        ) : (
          <>
            {searchResults.length > 0 && (
              <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 gap-y-12 ${currentType === "MANGA" ? "manga-theme" : ""}`}>
                {searchResults.map((anime) => {
                  const Card = currentType === "MANGA" ? MangaCard : AnimeCard;
                  return (
                    <Card
                      key={anime.id}
                      id={anime.id}
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
            )}

            {searchResults.length > 0 && (
              <Pagination 
                currentPage={currentPage} 
                hasNextPage={hasNextPage} 
                baseUrl="/search" 
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
