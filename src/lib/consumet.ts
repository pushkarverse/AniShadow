import { ANIME, META, MANGA, IAnimeInfo } from "@consumet/extensions";

let anilist: InstanceType<typeof META.Anilist> | null = null;
let animepahe: InstanceType<typeof ANIME.AnimePahe> | null = null;
let mangadex: InstanceType<typeof MANGA.MangaDex> | null = null;
let hianime: InstanceType<typeof ANIME.Hianime> | null = null;
const hianimeCountsCache = new Map<string, { sub: number; dub: number }>();
const hianimeNoMatchCache = new Map<string, number>();

const HIANIME_LOOKUP_TIMEOUT_MS = 3500;
const HIANIME_NO_MATCH_TTL_MS = 30 * 60 * 1000;
const MAX_TITLE_VARIANTS = 2;
const MAX_ENRICH_ITEMS_PER_PAGE = 10;
const ENRICH_CONCURRENCY = 3;

const getAnilist = () => {
    if (typeof window !== 'undefined') return null;
    if (!anilist) {
        try {
            anilist = new META.Anilist(new ANIME.Hianime());
        } catch (e) {
            console.error("Failed to load Anilist provider", e);
        }
    }
    return anilist;
};

const getMangaDex = () => {
    if (typeof window !== 'undefined') return null;
    if (!mangadex) mangadex = new MANGA.MangaDex();
    return mangadex;
};

const getHianime = () => {
  if (typeof window !== 'undefined') return null;
  if (!hianime) hianime = new ANIME.Hianime();
  return hianime;
};


interface AnilistNode {
    id: number;
    title: { romaji?: string; english?: string; native?: string };
    type: string;
    status: string;
    coverImage: { large: string };
    bannerImage?: string;
    season?: string;
    seasonYear?: number;
    chapters?: number;
    episodes?: number;
    nextAiringEpisode?: {
        episode: number;
    };
    averageScore?: number;
    countryOfOrigin?: string;
}

function getReleasedAnimeEpisodesCount(media: {
  status?: string;
  episodes?: number;
  nextAiringEpisode?: { episode: number };
}): number {
  const plannedEpisodes = typeof media.episodes === "number" ? media.episodes : 0;
  const nextEpisode = media.nextAiringEpisode?.episode;

  if (media.status === "NOT_YET_RELEASED") return 0;

  // For currently airing anime, AniList's next airing episode gives the most reliable released count.
  if (media.status === "RELEASING" && typeof nextEpisode === "number") {
    return Math.max(0, nextEpisode - 1);
  }

  if (plannedEpisodes > 0) return plannedEpisodes;
  if (typeof nextEpisode === "number") return Math.max(0, nextEpisode - 1);
  return 0;
}

async function withSuppressedHianimeErrors<T>(run: () => Promise<T>): Promise<T> {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args.map((value) => String(value ?? "")).join(" ");
    if (message.includes("Hianime scrapeCardPage error")) return;
    originalError(...args);
  };

  try {
    return await run();
  } finally {
    console.error = originalError;
  }
}

  function normalizeCompareTitle(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function scoreTitleMatch(a: string, b: string): number {
    const aa = normalizeCompareTitle(a);
    const bb = normalizeCompareTitle(b);
    if (!aa || !bb) return 0;
    if (aa === bb) return 1;
    if (aa.includes(bb) || bb.includes(aa)) return 0.9;
    let same = 0;
    const min = Math.min(aa.length, bb.length);
    for (let i = 0; i < min; i++) {
      if (aa[i] === bb[i]) same++;
    }
    return same / Math.max(aa.length, bb.length);
  }

  function buildTitleVariants(title: HeroResult["title"] | string): string[] {
    const rawTitles = typeof title === "string"
      ? [title]
      : [title.english, title.romaji, title.native].filter(Boolean) as string[];

    const variants = new Set<string>();

    for (const raw of rawTitles) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      variants.add(trimmed);

      const cleaned = trimmed
        .replace(/\(.*?\)/g, "")
        .replace(/\bseason\s*\d+\b/gi, "")
        .replace(/\bcour\s*\d+\b/gi, "")
        .replace(/\bpart\s*\d+\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      if (cleaned && cleaned !== trimmed) {
        variants.add(cleaned);
      }
    }

    return [...variants].slice(0, MAX_TITLE_VARIANTS);
  }

  async function getHianimeSubDubCounts(titleVariants: string[]): Promise<{ sub: number; dub: number } | null> {
    const variants = titleVariants.filter(Boolean);
    if (!variants.length) return null;

    const now = Date.now();
    for (const variant of variants) {
      const key = normalizeCompareTitle(variant);
      const missUntil = hianimeNoMatchCache.get(key);
      if (typeof missUntil === "number" && missUntil > now) return null;
    }

    for (const variant of variants) {
      const cached = hianimeCountsCache.get(normalizeCompareTitle(variant));
      if (cached) return cached;
    }

    const provider = getHianime();
    if (!provider) return null;

    try {
      let bestCounts: { sub: number; dub: number } | null = null;
      let bestScore = 0;

      for (const queryTitle of variants) {
        const search = await withSuppressedHianimeErrors(() => withTimeout(provider.search(queryTitle, 1), HIANIME_LOOKUP_TIMEOUT_MS));
        const results = search?.results || [];
        if (!results.length) continue;

        for (const item of results as any[]) {
          const candidateTitle = typeof item?.title === "string"
            ? item.title
            : (item?.title?.english || item?.title?.romaji || item?.title?.native || "");

          const score = Math.max(...variants.map((variant) => scoreTitleMatch(variant, candidateTitle)));
          const candidateCounts = {
            sub: Math.max(0, Number(item?.sub || 0)),
            dub: Math.max(0, Number(item?.dub || 0))
          };

          if (score < 0.55) continue;

          const shouldReplace =
            !bestCounts ||
            score > bestScore ||
            (score === bestScore && candidateCounts.dub > bestCounts.dub);

          if (shouldReplace) {
            bestScore = score;
            bestCounts = candidateCounts;
          }
        }
      }

      if (!bestCounts) return null;

      for (const variant of variants) {
        hianimeCountsCache.set(normalizeCompareTitle(variant), bestCounts);
      }

      return bestCounts;
    } catch {
      const missUntil = Date.now() + HIANIME_NO_MATCH_TTL_MS;
      for (const variant of variants) {
        hianimeNoMatchCache.set(normalizeCompareTitle(variant), missUntil);
      }
      return null;
    }
  }

  async function enrichAnimeResultsWithSubDub<T extends {
    title: HeroResult["title"] | string;
    type?: string;
    episodeNumber?: number;
    subEpisodes?: number;
    dubEpisodes?: number;
  }>(results: T[]): Promise<T[]> {
    if (!results.length) return results;

    const enriched = [...results];
    const candidates = enriched
      .filter((item) => item.type !== "MANGA")
      .slice(0, MAX_ENRICH_ITEMS_PER_PAGE);
    const concurrency = ENRICH_CONCURRENCY;

    for (let i = 0; i < candidates.length; i += concurrency) {
      const batch = candidates.slice(i, i + concurrency);
      await Promise.all(batch.map(async (item) => {
        const titleVariants = buildTitleVariants(item.title);
        if (!titleVariants.length) return;

        const counts = await getHianimeSubDubCounts(titleVariants);
        if (!counts) return;

        item.subEpisodes = counts.sub > 0 ? counts.sub : (item.subEpisodes ?? item.episodeNumber ?? 0);
        item.dubEpisodes = counts.dub;
      }));
    }

    return enriched;
  }

interface AnilistRelationEdge {
    relationType: string;
    node: AnilistNode;
}

interface AnilistRecommendationNode {
    mediaRecommendation: {
        id: number;
        title: { romaji?: string; english?: string };
        coverImage: { large: string };
        type: string;
        countryOfOrigin?: string;
        chapters?: number;
    };
}


const getAnimePahe = () => {
    if (typeof window !== 'undefined') return null;
    if (!animepahe) animepahe = new ANIME.AnimePahe();
    return animepahe;
};


import { getAnimeTitle, getMangaFormat } from "./anime-utils";
import type { HeroResult } from "@/types/anime";



async function fetchAnilistDirect(id: string): Promise<IAnimeInfo | null> {
    const query = `
    query ($id: Int) {
      Media (id: $id) {
        id
        type
        title { romaji english native }
        description
        bannerImage
        coverImage { large }
        status
        chapters
        episodes
        nextAiringEpisode {
          episode
        }
        source
        genres
        season
        seasonYear
        countryOfOrigin
        startDate { year }
        relations {
          edges {
            relationType
            node {
              id
              title { romaji english }
              type
              countryOfOrigin
              chapters
              status
              coverImage { large }
              bannerImage
              season
              seasonYear
            }
          }
        }
        recommendations (perPage: 5, sort: [RATING_DESC]) {
          nodes {
            mediaRecommendation {
              id
              title { romaji english }
              coverImage { large }
              type
              countryOfOrigin
              chapters
            }
          }
        }
      }
    }`;

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables: { id: parseInt(id) } })
        });
        const data = await response.json();
        const media = data?.data?.Media;
        if (!media) return null;

        const releasedEpisodes = getReleasedAnimeEpisodesCount(media);

        return {
            id: media.id.toString(),
            title: media.title,
            description: media.description,
            image: media.coverImage?.large,
            cover: media.bannerImage || media.coverImage?.large,
            status: media.status,
            releaseDate: media.startDate?.year?.toString() || "Unknown",
            season: media.season,
            seasonYear: media.seasonYear,
            genres: media.genres || [],
            source: media.source,
            relations: media.relations?.edges?.map((edge: AnilistRelationEdge) => ({
                id: edge.node.id.toString(),
                relationType: edge.relationType,
                title: edge.node.title,
                type: edge.node.type,
                countryOfOrigin: edge.node.countryOfOrigin,
                chapters: edge.node.chapters,
                status: edge.node.status,
                image: edge.node.coverImage?.large,
                cover: edge.node.bannerImage || edge.node.coverImage?.large
            })),
            recommendations: media.recommendations?.nodes?.map((node: AnilistRecommendationNode) => ({
                id: node.mediaRecommendation?.id.toString(),
                title: node.mediaRecommendation?.title,
                image: node.mediaRecommendation?.coverImage?.large,
                type: node.mediaRecommendation?.type,
                countryOfOrigin: node.mediaRecommendation?.countryOfOrigin,
                chapters: node.mediaRecommendation?.chapters
            })),
            totalEpisodes: media.episodes,
            currentEpisode: releasedEpisodes,
            episodes: Array.from({ length: releasedEpisodes }, (_, i) => ({
                id: `${media.id}-episode-${i + 1}`,
                number: i + 1,
                title: `Episode ${i + 1}`
            })),
            type: media.type,
            countryOfOrigin: media.countryOfOrigin
        } as unknown as IAnimeInfo;
    } catch {
        return null;
    }
}

export async function searchAnime(query: string, page: number = 1) {
    const provider = getAnilist();
    if (!provider) return { results: [] };
    try {
        return await provider.search(query, page);
    } catch (e) {
        console.error("Search fetch failed:", e);
        return { results: [] };
    }
}


export async function getTrendingAnime(page: number = 1, perPage: number = 20, period: string = "NOW"): Promise<{ results: HeroResult[], hasNextPage: boolean }> {
    let sort = "[TRENDING_DESC, POPULARITY_DESC]";
    let statusIn = "[RELEASING]";
    let season: string | undefined = undefined;
    let seasonYear: number | undefined = undefined;

    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth(); // 0 is Jan, 11 is Dec
    
    // Determine current season for Anilist
    // WINTER (Jan, Feb, Mar), SPRING (Apr, May, Jun), SUMMER (Jul, Aug, Sep), FALL (Oct, Nov, Dec)
    const currentSeason = month < 3 ? "WINTER" : month < 6 ? "SPRING" : month < 9 ? "SUMMER" : "FALL";

    // Map periods to Anilist sorts and filters for better "accuracy"
    if (period === "WEEK") {
        sort = "[TRENDING_DESC]";
        statusIn = "[RELEASING, FINISHED]";
    } else if (period === "MONTH") {
        sort = "[POPULARITY_DESC]";
        statusIn = "[RELEASING, FINISHED]";
        season = currentSeason;
        seasonYear = currentYear;
    } else if (period === "DAY" || period === "NOW") {
        sort = "[TRENDING_DESC]";
        statusIn = "[RELEASING]";
    }

    const query = `
    query ($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
      Page (page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media (type: ANIME, sort: ${sort}, status_in: ${statusIn}, season: $season, seasonYear: $seasonYear) {
          id
          title { romaji english native }
          coverImage { large }
          bannerImage
          description
          genres
          type
          status
          episodes
          nextAiringEpisode {
            episode
          }
          averageScore
          seasonYear
        }
      }
    }`;

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: query, variables: { page, perPage, season, seasonYear } })
        });
        const data = await response.json();
        const pageInfo = data?.data?.Page?.pageInfo;
        let results = data?.data?.Page?.media?.map((m: AnilistNode & { bannerImage?: string, description?: string, genres?: string[] }) => ({
            id: m.id.toString(),
            title: m.title,
            image: m.coverImage?.large,
            cover: m.bannerImage || m.coverImage?.large,
            description: m.description,
            genres: m.genres,
            type: m.type,
            rating: m.averageScore,
            releaseDate: m.seasonYear || "2024",
          episodeNumber: getReleasedAnimeEpisodesCount(m),
          subEpisodes: getReleasedAnimeEpisodesCount(m)
        })) || [];

        // Enrich the Top 5 Hero items with Kitsu posters for "Wow" factor
        if (results.length > 0) {
            results = await Promise.all(results.map(async (anime: HeroResult, idx: number) => {
                if (idx > 4 || !anime.title) return anime;
                try {
                    const searchTitle = anime.title.english || anime.title.romaji;
                    if (!searchTitle) return anime;
                    const kitsuRes = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(searchTitle)}&page[limit]=1`, { next: { revalidate: 3600 } });
                    if (kitsuRes.ok) {
                        const kitsuData = await kitsuRes.json();
                        const kitsuCover = kitsuData?.data?.[0]?.attributes?.coverImage?.original || kitsuData?.data?.[0]?.attributes?.coverImage?.large;
                        if (kitsuCover) {
                            anime.cover = kitsuCover;
                        }
                    }
                } catch (e) {
                    // Ignore errors to not block page load
                }
                return anime;
            }));
        }

        const enrichedResults = await enrichAnimeResultsWithSubDub(results);
        return { results: enrichedResults, hasNextPage: pageInfo?.hasNextPage || false };
    } catch {
        return { results: [], hasNextPage: false };
    }
}

export async function getSeasonalAnime(season: string, year: number, page: number = 1) {
    const query = `
    query ($season: MediaSeason, $seasonYear: Int, $page: Int) {
      Page (page: $page, perPage: 20) {
        pageInfo { hasNextPage }
        media (season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english native }
          coverImage { large }
          type
          status
          episodes
          nextAiringEpisode {
            episode
          }
          averageScore
        }
      }
    }`;

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables: { season, seasonYear: year, page } })
        });
        const data = await response.json();
        const pageInfo = data?.data?.Page?.pageInfo;
        let results = data?.data?.Page?.media?.map((m: AnilistNode) => ({
            id: m.id.toString(),
            title: m.title,
            image: m.coverImage?.large,
            type: m.type,
            rating: m.averageScore,
          episodeNumber: getReleasedAnimeEpisodesCount(m),
          subEpisodes: getReleasedAnimeEpisodesCount(m)
        })) || [];
        results = await enrichAnimeResultsWithSubDub(results);
        return { results, hasNextPage: pageInfo?.hasNextPage || false };
    } catch {
        return { results: [], hasNextPage: false };
    }
}

export async function advancedSearchAnime({
  query: search,
  page = 1,
  genres,
  status,
  season,
  year,
  format,
  sort = "POPULARITY_DESC",
  type = "ANIME"
}: {
  query?: string;
  page?: number;
  genres?: string[];
  status?: string;
  season?: string;
  year?: number;
  format?: string;
  sort?: string;
  type?: "ANIME" | "MANGA";
}) {
    const gqlQuery = `
    query ($page: Int, $search: String, $genres: [String], $status: MediaStatus, $season: MediaSeason, $seasonYear: Int, $format: MediaFormat, $sort: [MediaSort], $type: MediaType) {
      Page (page: $page, perPage: 20) {
        pageInfo { hasNextPage }
        media (search: $search, genre_in: $genres, status: $status, season: $season, seasonYear: $seasonYear, format: $format, type: $type, sort: $sort) {
          id
          title { romaji english native }
          coverImage { large }
          type
          status
          episodes
          chapters
          nextAiringEpisode {
            episode
          }
          averageScore
          countryOfOrigin
        }
      }
    }`;

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ 
                query: gqlQuery, 
                variables: { 
                    search: search || undefined, 
                    page, 
                    genres: genres?.length ? genres : undefined,
                    status: status || undefined,
                    season: season || undefined,
                    seasonYear: year || undefined,
                    format: format || undefined,
                    sort: [sort],
                    type
                } 
            })
        });
        const data = await response.json();
        const pageInfo = data?.data?.Page?.pageInfo;
        let results = data?.data?.Page?.media?.map((m: AnilistNode) => ({
            id: m.id.toString(),
            title: m.title,
            image: m.coverImage?.large,
            type: m.type,
            rating: m.averageScore,
          episodeNumber: m.type === "MANGA" ? m.chapters : getReleasedAnimeEpisodesCount(m),
          subEpisodes: m.type === "MANGA" ? m.chapters : getReleasedAnimeEpisodesCount(m),
            countryOfOrigin: m.countryOfOrigin
        })) || [];
        results = await enrichAnimeResultsWithSubDub(results);
        return { results, hasNextPage: pageInfo?.hasNextPage || false };
    } catch {
        return { results: [], hasNextPage: false };
    }
}

export async function getMediaByGenre(genres: string[], type: 'ANIME' | 'MANGA' = 'ANIME', page: number = 1) {
    const query = `
    query ($genres: [String], $page: Int, $type: MediaType) {
      Page (page: $page, perPage: 24) {
        media (genre_in: $genres, type: $type, sort: POPULARITY_DESC) {
          id
          title { romaji english native }
          coverImage { large }
          type
          status
          episodes
          chapters
          nextAiringEpisode {
            episode
          }
          averageScore
          countryOfOrigin
        }
      }
    }`;

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables: { genres, page, type } })
        });
        const data = await response.json();
        const results = data?.data?.Page?.media?.map((m: AnilistNode) => ({
            id: m.id.toString(),
            title: m.title,
            image: m.coverImage?.large,
            type: m.type,
            rating: m.averageScore,
          episodeNumber: m.type === "MANGA" ? m.chapters : getReleasedAnimeEpisodesCount(m),
          subEpisodes: m.type === "MANGA" ? m.chapters : getReleasedAnimeEpisodesCount(m),
            countryOfOrigin: m.countryOfOrigin
        })) || [];
        return await enrichAnimeResultsWithSubDub(results);
    } catch {
        return [];
    }
}

export async function getPopularAnime(page: number = 1, perPage: number = 20) {
    const query = `
    query ($page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media (type: ANIME, sort: [POPULARITY_DESC]) {
          id
          title { romaji english native }
          coverImage { large }
          type
          status
          episodes
          nextAiringEpisode {
            episode
          }
          averageScore
        }
      }
    }`;

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables: { page, perPage } })
        });
        const data = await response.json();
        const pageInfo = data?.data?.Page?.pageInfo;
        let results = data?.data?.Page?.media?.map((m: AnilistNode) => ({
            id: m.id.toString(),
            title: m.title,
            image: m.coverImage?.large,
            type: m.type,
            rating: m.averageScore,
          episodeNumber: getReleasedAnimeEpisodesCount(m),
          subEpisodes: getReleasedAnimeEpisodesCount(m)
        })) || [];
        results = await enrichAnimeResultsWithSubDub(results);
        return { results, hasNextPage: pageInfo?.hasNextPage || false };
    } catch {
        return { results: [], hasNextPage: false };
    }
}

export async function getAnimeDetails(id: string): Promise<IAnimeInfo | null> {
    try {
        // 1. Try direct GraphQL first (Most reliable, no scraper noise)
        const directData = await fetchAnilistDirect(id);
        if (directData) return directData;
    } catch (e) {
        console.error("Anime details fetch failed:", e);
    }

    // 2. Try library provider (Anilist mapping) as a fallback
    const provider = getAnilist();
    if (provider) {
        try {
            const data = await provider.fetchAnimeInfo(id);
            if (data && data.title) return data;
        } catch {}
    }

    // 3. Fallback for slugs (Use AnimePahe as the primary detail provider for slugs)
    if (isNaN(Number(id))) {
        try {
            const pahe = getAnimePahe();
            if (pahe) return await pahe.fetchAnimeInfo(id);
        } catch {}
    }
    
    return null;
}

function normalizeTitle(title: string): string[] {
    const variations = [title];
    if (title.includes(':')) variations.push(title.split(':')[0].trim());
    const seasonMatch = title.match(/(.*)\s+season\s+\d+/i);
    if (seasonMatch) variations.push(seasonMatch[1].trim());
    const partMatch = title.match(/(Part\s+\d+)/i);
    if (partMatch) variations.push(title.replace(partMatch[0], "").trim());
    const tags = ['(TV)', '(Movie)', 'UNCENSORED', 'DUB', 'SUB'];
    let cleanTitle = title;
    tags.forEach(tag => { cleanTitle = cleanTitle.replace(tag, ''); });
    if (cleanTitle !== title) variations.push(cleanTitle.trim());
    return [...new Set(variations)];
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> {
    const timeout = new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    );
    return Promise.race([promise, timeout]);
}

export async function getStreamingLinks(
    episodeId: string, 
    relativeEpisodeNumber: number, 
    absoluteEpisodeNumber?: number, 
    animeTitle?: string | { english?: string; romaji?: string; native?: string }
) {
    try {
        const absEp = absoluteEpisodeNumber || relativeEpisodeNumber;
        const animeIdMatch = episodeId.match(/(\d+)/);
        const animeId = animeIdMatch ? animeIdMatch[1] : episodeId;

        // 1. Primary Engine: Gogoanime via AniList (100% Native ID Mapping)
        try {
            const anilistProvider = getAnilist();
            if (anilistProvider) {
                const info = await anilistProvider.fetchAnimeInfo(animeId);
                const ep = info.episodes?.find((e: any) => e.number === absEp || e.number === relativeEpisodeNumber);
                if (ep?.id) {
                    const sources = await anilistProvider.fetchEpisodeSources(ep.id);
                    if (sources && sources.sources?.length > 0) return sources;
                }
            }
        } catch (e) {
            console.error("Gogoanime native fallback failed", typeof e === 'object' && e !== null ? (e as Error).message : e);
        }

        // 2. Secondary Backup Engine: AnimePahe with Strict Fuzzy Matching
        const pahe = getAnimePahe();
        if (pahe) {
            const variations = normalizeTitle(getAnimeTitle(animeTitle));
            const pahePromises = variations.map(async (query: string) => {
                try {
                    const searchResults = await withTimeout(pahe.search(query), 10000);
                    if (searchResults?.results?.length) {
                        // Strict Matching: Ensure we don't accidentally grab a wrong season
                        let targetAnime = searchResults.results[0]; // fallback
                        const exactMatch = searchResults.results.find((r: any) => {
                            if (!r.title) return false;
                            const t = r.title.toLowerCase();
                            const q = query.toLowerCase();
                            return t === q || t.includes(q) || q.includes(t);
                        });
                        
                        if (exactMatch) targetAnime = exactMatch;

                        const animeInfo = await withTimeout(pahe.fetchAnimeInfo(targetAnime.id), 10000);
                        const ep = animeInfo.episodes?.find((e: { number: number; id: string }) => e.number === absEp || e.number === relativeEpisodeNumber);
                        if (ep?.id) {
                            return await withTimeout(pahe.fetchEpisodeSources(ep.id), 10000);
                        }
                    }
                } catch { }
                return null;
            });

            const paheResults = await Promise.all(pahePromises);
            const successfulPahe = paheResults.find(r => r && r.sources?.length > 0);
            if (successfulPahe) {
                return successfulPahe;
            }
        }
        return { sources: [] };
    } catch {
        return { sources: [] };
    }
}

export async function getTrendingManga(page: number = 1, perPage: number = 20): Promise<{ results: any[], hasNextPage: boolean }> {
  const query = `
  query ($page: Int, $perPage: Int) {
    Page (page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media (type: MANGA, sort: TRENDING_DESC) {
        id
        title { romaji english native }
        coverImage { large }
        bannerImage
        description
        genres
        status
        chapters
        averageScore
        countryOfOrigin
        seasonYear
      }
    }
  }`;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { page, perPage } })
    });
    const data = await response.json();
    const pageInfo = data?.data?.Page?.pageInfo;
    const results = data?.data?.Page?.media?.map((m: any) => ({
      id: m.id.toString(),
      title: m.title,
      image: m.coverImage?.large,
      cover: m.bannerImage || m.coverImage?.large,
      description: m.description,
      genres: m.genres,
      rating: m.averageScore,
      releaseDate: m.seasonYear || "2024",
      chapters: m.chapters,
      countryOfOrigin: m.countryOfOrigin,
      type: "MANGA"
    })) || [];

    return { results, hasNextPage: pageInfo?.hasNextPage || false };
  } catch {
    return { results: [], hasNextPage: false };
  }
}

export async function getPopularManga(page: number = 1, perPage: number = 20): Promise<{ results: any[], hasNextPage: boolean }> {
  const query = `
  query ($page: Int, $perPage: Int) {
    Page (page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media (type: MANGA, sort: [POPULARITY_DESC]) {
        id
        title { romaji english native }
        coverImage { large }
        bannerImage
        description
        genres
        status
        chapters
        averageScore
        countryOfOrigin
        seasonYear
      }
    }
  }`;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { page, perPage } })
    });
    const data = await response.json();
    const pageInfo = data?.data?.Page?.pageInfo;
    const results = data?.data?.Page?.media?.map((m: any) => ({
      id: m.id.toString(),
      title: m.title,
      image: m.coverImage?.large,
      cover: m.bannerImage || m.coverImage?.large,
      description: m.description,
      genres: m.genres,
      rating: m.averageScore,
      releaseDate: m.seasonYear || "2024",
      chapters: m.chapters,
      countryOfOrigin: m.countryOfOrigin,
      type: "MANGA"
    })) || [];

    return { results, hasNextPage: pageInfo?.hasNextPage || false };
  } catch {
    return { results: [], hasNextPage: false };
  }
}

export async function getMangaDetails(id: string) {
  try {
    const mangaInfo = await fetchAnilistDirect(id);
    if (!mangaInfo) return null;

    // For Manga chapters, we need to search on MangaDex or another provider using the title
    const dex = getMangaDex();
    if (dex) {
      const searchTitle = typeof mangaInfo.title === 'string' ? mangaInfo.title : mangaInfo.title?.english || mangaInfo.title?.romaji || "";
      const searchResults = await dex.search(searchTitle);
      if (searchResults.results?.length > 0) {
        const bestMatch = searchResults.results[0];
        const fullMangaInfo = await dex.fetchMangaInfo(bestMatch.id);
        return {
          ...mangaInfo,
          chapters: (fullMangaInfo as any).chapters || []
        };
      }
    }

    return mangaInfo;
  } catch (e) {
    console.error("Manga details fetch failed:", e);
    return null;
  }
}

export async function getMangaChapterPages(chapterId: string) {
  try {
    const dex = getMangaDex();
    if (!dex) return [];
    return await dex.fetchChapterPages(chapterId);
  } catch (e) {
    console.error("Manga chapter pages fetch failed:", e);
    return [];
  }
}
