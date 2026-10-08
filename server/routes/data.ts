import {
  advancedSearchAnime,
  getAnimeDetails,
  getMediaByGenre,
  getOngoingAnime,
  getPopularAnime,
  getPopularManga,
  getPopularNovels,
  getReaderChapterPages,
  getReaderDetails,
  getStreamingLinks,
  getTrendingAnime,
  getTrendingManga,
  getTrendingNovels,
  searchNovel,
} from "@/lib/consumet";

const EMPTY_LIST = { results: [], hasNextPage: false };

// GET /api/anime/home
export async function animeHomeHandler(): Promise<Response> {
  try {
    const [trendingData, popularData, ongoingDataJP] = await Promise.all([
      getTrendingAnime(),
      getPopularAnime(),
      getOngoingAnime(1, 24, "JP"),
    ]);
    return Response.json({
      trending: trendingData?.results || [],
      popular: popularData?.results || [],
      ongoing: ongoingDataJP?.results || [],
    });
  } catch (err) {
    console.error("Anime home data fetch failed:", err);
    return Response.json({ trending: [], popular: [], ongoing: [] });
  }
}

// GET /api/anime/list?kind=trending|popular|ongoing&page=&perPage=&country=
export async function animeListHandler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") || "trending";
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "24");
  const country = searchParams.get("country") || undefined;

  try {
    let data: any;
    if (kind === "popular") {
      data = await getPopularAnime(page, perPage);
    } else if (kind === "ongoing") {
      data = await getOngoingAnime(page, perPage, country);
    } else {
      data = await getTrendingAnime(page, perPage);
    }
    return Response.json({
      results: data?.results || [],
      hasNextPage: data?.hasNextPage || false,
    });
  } catch (error) {
    console.error("Anime list API Error:", error);
    return Response.json(EMPTY_LIST, { status: 500 });
  }
}

// GET /api/anime/advanced-search
export async function advancedSearchHandler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
  const currentType = searchParams.get("type") || "ANIME";
  const selectedGenres = searchParams.get("genres")
    ? searchParams.get("genres")!.split(",")
    : undefined;
  const selectedTags = searchParams.get("tags")
    ? searchParams.get("tags")!.split(",")
    : undefined;
  const status = searchParams.get("status") || undefined;
  const season = searchParams.get("season") || undefined;
  const format = searchParams.get("format") || undefined;
  const year = searchParams.get("year")
    ? parseInt(searchParams.get("year")!)
    : undefined;
  const origin = searchParams.get("origin") || undefined;

  try {
    if (currentType === "NOVEL") {
      const data = await searchNovel(query, page);
      return Response.json({
        results: data?.results || [],
        hasNextPage: data?.hasNextPage || false,
        total: data?.total || 0,
      });
    }

    let originParam = origin;
    if (currentType === "MANHWA") {
      originParam = "KR";
    } else if (currentType === "MANGA" && !originParam) {
      originParam = "JP";
    }

    const data = await advancedSearchAnime({
      query,
      page,
      genres: selectedGenres,
      tags: selectedTags,
      status,
      season,
      year,
      format,
      type:
        currentType === "MANGA" || currentType === "MANHWA" ? "MANGA" : "ANIME",
      countryOfOrigin: originParam,
    });

    return Response.json({
      results: data?.results || [],
      hasNextPage: data?.hasNextPage || false,
      total: data?.total || 0,
    });
  } catch (error) {
    console.error("Advanced search API Error:", error);
    return Response.json(
      { results: [], hasNextPage: false, total: 0 },
      { status: 500 }
    );
  }
}

// GET /api/anime/:id/details
export async function animeDetailsHandler(id: string): Promise<Response> {
  try {
    const anime = await getAnimeDetails(id);
    if (!anime) {
      return Response.json({ anime: null }, { status: 404 });
    }
    return Response.json({ anime });
  } catch (error) {
    console.error("Anime details API Error:", error);
    return Response.json({ anime: null }, { status: 500 });
  }
}

// GET /api/anime/:id/related?type=&genres=
export async function animeRelatedHandler(
  id: string,
  request: Request
): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "MANGA" ? "MANGA" : "ANIME";
  const genres = (searchParams.get("genres") || "")
    .split(",")
    .filter((g) => g.length > 0);

  if (genres.length === 0) {
    return Response.json({ results: [] });
  }

  try {
    const results = await getMediaByGenre(genres, type);
    return Response.json({ results: results || [] });
  } catch (error) {
    console.error("Related media API Error:", error);
    return Response.json({ results: [] }, { status: 500 });
  }
}

// GET /api/anime/:id/watch?ep=N
export async function watchHandler(
  id: string,
  request: Request
): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const episodeNumber = parseInt(searchParams.get("ep") || "1");

  try {
    const anime = await getAnimeDetails(id);
    if (!anime) {
      return Response.json({ anime: null, stream: null }, { status: 404 });
    }

    const stream = await getStreamingLinks(
      id,
      episodeNumber,
      episodeNumber,
      anime.title
    );

    return Response.json({ anime, stream });
  } catch (error) {
    console.error("Watch API Error:", error);
    return Response.json({ anime: null, stream: null }, { status: 500 });
  }
}

// GET /api/reader/home?tab=manga|novel
export async function readerHomeHandler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const activeTab = searchParams.get("tab") === "novel" ? "novel" : "manga";

  try {
    const [
      trendingManga,
      popularManga,
      trendingManhwa,
      popularManhwa,
      trendingNovels,
      popularNovels,
    ] = await Promise.all([
      activeTab === "manga"
        ? getTrendingManga(1, 15, "JP")
        : Promise.resolve({ results: [] }),
      activeTab === "manga"
        ? getPopularManga(1, 15, "JP")
        : Promise.resolve({ results: [] }),
      activeTab === "manga"
        ? getTrendingManga(1, 15, "KR")
        : Promise.resolve({ results: [] }),
      activeTab === "manga"
        ? getPopularManga(1, 15, "KR")
        : Promise.resolve({ results: [] }),
      activeTab === "novel"
        ? getTrendingNovels(1, 50)
        : Promise.resolve({ results: [] }),
      activeTab === "novel"
        ? getPopularNovels(1, 50)
        : Promise.resolve({ results: [] }),
    ]);

    return Response.json({
      tab: activeTab,
      trendingManga,
      popularManga,
      trendingManhwa,
      popularManhwa,
      trendingNovels,
      popularNovels,
    });
  } catch (error) {
    console.error("Reader home API Error:", error);
    return Response.json({
      tab: activeTab,
      trendingManga: { results: [] },
      popularManga: { results: [] },
      trendingManhwa: { results: [] },
      popularManhwa: { results: [] },
      trendingNovels: { results: [] },
      popularNovels: { results: [] },
    });
  }
}

// GET /api/reader/details/:id
export async function readerDetailsHandler(id: string): Promise<Response> {
  try {
    const details = await getReaderDetails(id);
    if (!details) {
      return Response.json({ details: null }, { status: 404 });
    }
    return Response.json({ details });
  } catch (error) {
    console.error("Reader details API Error:", error);
    return Response.json({ details: null }, { status: 500 });
  }
}

// GET /api/reader/chapter?id=&chapter=
export async function readerChapterHandler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  const chapter = searchParams.get("chapter") || "";

  if (!chapter) {
    return Response.json({ pages: null, manga: null }, { status: 400 });
  }

  try {
    const pages = await getReaderChapterPages(chapter);
    let manga: any = null;
    if (id) {
      try {
        manga = await getReaderDetails(id);
      } catch (e) {
        console.error("Reader chapter details fetch failed:", e);
      }
    }
    return Response.json({ pages: pages || null, manga });
  } catch (error) {
    console.error("Reader chapter API Error:", error);
    return Response.json({ pages: null, manga: null }, { status: 500 });
  }
}
