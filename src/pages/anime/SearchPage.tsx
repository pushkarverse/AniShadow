import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AnimeCard } from "@/components/AnimeCard";
import { ReaderCard } from "@/components/ReaderCard";
import { SearchFilters } from "@/components/SearchFilters";
import { Pagination } from "@/components/Pagination";
import { PageLoader } from "@/components/PageLoader";
import { getAnimeTitle } from "@/lib/anime-utils";
import { useSearchParams } from "@/compat/navigation";
import { Search as SearchIcon } from "lucide-react";
import Link from "@/compat/Link";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q");
  const page = searchParams.get("page");
  const genres = searchParams.get("genres");
  const tags = searchParams.get("tags");
  const status = searchParams.get("status");
  const season = searchParams.get("season");
  const format = searchParams.get("format");
  const type = searchParams.get("type");
  const year = searchParams.get("year");
  const origin = searchParams.get("origin");

  const query = q || "";
  const currentPage = page ? parseInt(page) : 1;
  const selectedGenres = genres ? genres.split(",") : undefined;
  const selectedTags = tags ? tags.split(",") : undefined;
  const currentYear = year ? parseInt(year) : undefined;
  const currentType = (type || "ANIME") as "ANIME" | "MANGA" | "MANHWA" | "NOVEL";

  const buildSearchUrl = (targetType: "ANIME" | "MANGA" | "MANHWA" | "NOVEL") => {
    const params: string[] = [];
    if (query) params.push(`q=${encodeURIComponent(query)}`);
    if (genres) params.push(`genres=${encodeURIComponent(genres)}`);
    if (tags) params.push(`tags=${encodeURIComponent(tags)}`);
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (season && targetType === "ANIME") params.push(`season=${encodeURIComponent(season)}`);
    if (format) {
      const animeFormats = ["TV", "MOVIE", "SPECIAL", "OVA", "ONA"];
      const mangaFormats = ["MANGA", "NOVEL", "ONE_SHOT"];
      const isValid = (targetType === "MANGA" || targetType === "MANHWA")
        ? mangaFormats.includes(format)
        : animeFormats.includes(format);
      if (isValid && targetType !== "NOVEL") {
        params.push(`format=${encodeURIComponent(format)}`);
      }
    }
    if (year) params.push(`year=${encodeURIComponent(year)}`);
    if (origin && (targetType === "MANGA" || targetType === "MANHWA")) {
      params.push(`origin=${encodeURIComponent(origin)}`);
    }
    params.push(`type=${targetType}`);
    return `/anime/search?${params.join("&")}`;
  };

  // Fetch results if there's a query OR any filters selected
  const hasFilters = genres || tags || status || season || format || year || type || origin;

  const [state, setState] = useState<{
    results: any[];
    hasNextPage: boolean;
    total: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState(null);

    if (query || hasFilters) {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (currentPage) params.set("page", String(currentPage));
      if (genres) params.set("genres", genres);
      if (tags) params.set("tags", tags);
      if (status) params.set("status", status);
      if (season) params.set("season", season);
      if (format) params.set("format", format);
      if (year) params.set("year", year);
      if (origin) params.set("origin", origin);
      params.set("type", currentType);

      fetch(`/api/anime/advanced-search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) {
            setState({
              results: data.results || [],
              hasNextPage: data.hasNextPage || false,
              total: data.total || 0,
            });
          }
        })
        .catch(() => {
          if (!cancelled) setState({ results: [], hasNextPage: false, total: 0 });
        });
    } else {
      setState({ results: [], hasNextPage: false, total: 0 });
    }

    return () => {
      cancelled = true;
    };
  }, [query, currentPage, hasFilters, genres, tags, status, season, format, year, origin, currentType]);

  const themeClass = (currentType === "MANGA" || currentType === "MANHWA" || currentType === "NOVEL")
    ? "reader-theme"
    : "";

  if (!state) {
    return (
      <div className={`min-h-screen bg-background text-foreground flex flex-col pb-24 ${themeClass}`}>
        <Navbar />

        <main className="flex-1 container mx-auto px-4 md:px-8 pt-24 md:pt-32 max-w-6xl">
          <PageLoader />
        </main>
      </div>
    );
  }

  const searchResults = state.results;
  const hasNextPage = state.hasNextPage;
  const totalResults = state.total;

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col pb-24 ${themeClass}`}>
      <Navbar />

      <main className="flex-1 container mx-auto px-4 md:px-8 pt-24 md:pt-32 max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[320px_1fr] lg:items-start">
          {/* Left: Search + Filters */}
          <aside className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-2xl">
            <div className="flex flex-col gap-1 mb-4">
              <h1 className="text-lg font-black text-white uppercase tracking-wider pl-0.5">
                Search {currentType.toLowerCase()}
              </h1>
            </div>

            {/* Search Type Switcher */}
            <div className="flex flex-col gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/5 mb-5 select-none">
              <div className="flex gap-1.5">
                <Link
                  href={buildSearchUrl("ANIME")}
                  className={`flex-1 py-2 rounded-xl text-center text-[10px] font-black uppercase tracking-widest transition-all ${currentType === "ANIME"
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-white/40 hover:text-white"
                    }`}
                >
                  Anime
                </Link>
                <Link
                  href={buildSearchUrl("MANGA")}
                  className={`flex-1 py-2 rounded-xl text-center text-[10px] font-black uppercase tracking-widest transition-all ${currentType === "MANGA"
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-white/40 hover:text-white"
                    }`}
                >
                  Manga
                </Link>
              </div>
              <div className="flex gap-1.5">
                <Link
                  href={buildSearchUrl("MANHWA")}
                  className={`flex-1 py-2 rounded-xl text-center text-[10px] font-black uppercase tracking-widest transition-all ${currentType === "MANHWA"
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-white/40 hover:text-white"
                    }`}
                >
                  Manhwa
                </Link>
                <Link
                  href={buildSearchUrl("NOVEL")}
                  className={`flex-1 py-2 rounded-xl text-center text-[10px] font-black uppercase tracking-widest transition-all ${currentType === "NOVEL"
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-white/40 hover:text-white"
                    }`}
                >
                  Novels
                </Link>
              </div>
            </div>

            <form action="/anime/search" method="GET" className="mb-5 relative w-full group">
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
              {origin && <input type="hidden" name="origin" value={origin} />}
              <input type="hidden" name="type" value={currentType} />
            </form>

            <SearchFilters />
          </aside>

          {/* Right: Results */}
          <section className="min-w-0">
            {(query || hasFilters) && searchResults.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-2xl border border-white/5 max-w-3xl mx-auto shadow-2xl">
                <h2 className="text-2xl font-black text-accent mb-3 uppercase tracking-wider italic">No Masterpieces Found</h2>
                <p className="text-white/40 mb-8 leading-relaxed max-w-md mx-auto text-sm">
                  Your search for &quot;{query || "these filters"}&quot; didn&apos;t return any results.
                  Try adjusted parameters or check your spelling.
                </p>
                <Link
                  href="/anime/search"
                  className="px-8 py-3 bg-primary text-white font-black uppercase tracking-wider rounded-xl hover:bg-primary/95 transition-all shadow-lg inline-block text-xs"
                >
                  Reset Discovery
                </Link>
              </div>
            ) : (
              <>
                {searchResults.length > 0 && (
                  <>
                    <div className="mb-6 text-xs text-sky-400 font-bold font-mono pl-1 tracking-wide">
                      {totalResults.toLocaleString()} results found
                    </div>

                    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 ${themeClass}`}>
                      {searchResults.map((anime, idx) => {
                        const isComicOrBook = currentType === "MANGA" || currentType === "MANHWA" || currentType === "NOVEL";
                        const Card = isComicOrBook ? ReaderCard : AnimeCard;
                        return (
                          <Card
                            key={`search-result-${anime.id || 'search'}-${idx}`}
                            id={anime.id}
                            variant="search"
                            title={getAnimeTitle(anime.title)}
                            image={anime.image && anime.image !== "" ? anime.image : "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=500&auto=format&fit=crop"}
                            rating={anime.rating ? anime.rating / 10 : undefined}
                            type={currentType}
                            slug={anime.slug}
                            {...(isComicOrBook ? {
                              chapterNumber: (anime as any).episodeNumber,
                              countryOfOrigin: (anime as any).countryOfOrigin,
                              chapters: (anime as any).episodeNumber
                            } : {
                              episodeNumber: (anime as any).episodeNumber,
                              subEpisodes: (anime as any).subEpisodes,
                              dubEpisodes: (anime as any).dubEpisodes,
                              duration: (anime as any).duration
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
                      baseUrl="/anime/search"
                    />
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
