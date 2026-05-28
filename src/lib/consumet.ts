import { ANIME, META, MANGA, IAnimeInfo } from "@consumet/extensions";
import { load } from "cheerio";

let anilist: InstanceType<typeof META.Anilist> | null = null;
let animepahe: InstanceType<typeof ANIME.AnimePahe> | null = null;
let mangadex: InstanceType<typeof MANGA.MangaDex> | null = null;
let comick: InstanceType<typeof MANGA.ComicK> | null = null;
let mangareader: InstanceType<typeof MANGA.MangaReader> | null = null;
let hianime: InstanceType<typeof ANIME.Hianime> | null = null;
let kickassanime: InstanceType<typeof ANIME.KickAssAnime> | null = null;
let animekai: InstanceType<typeof ANIME.AnimeKai> | null = null;
let animesaturn: InstanceType<typeof ANIME.AnimeSaturn> | null = null;
let animeunity: InstanceType<typeof ANIME.AnimeUnity> | null = null;
let animesama: InstanceType<typeof ANIME.AnimeSama> | null = null;

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
      // Use Gogoanime as the primary provider for AniList as it's more stable for ID mapping
      anilist = new META.Anilist();
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

const getComicK = () => {
  if (typeof window !== 'undefined') return null;
  if (!comick) comick = new MANGA.ComicK();
  return comick;
};

const getMangaReader = () => {
  if (typeof window !== 'undefined') return null;
  if (!mangareader) mangareader = new MANGA.MangaReader();
  return mangareader;
};

const getHianime = () => {
  if (typeof window !== 'undefined') return null;
  if (!hianime) hianime = new ANIME.Hianime();
  return hianime;
};

const getKickAssAnime = () => {
  if (typeof window !== 'undefined') return null;
  if (!kickassanime) kickassanime = new ANIME.KickAssAnime();
  return kickassanime;
};

const getAnimeKai = () => {
  if (typeof window !== 'undefined') return null;
  if (!animekai) animekai = new ANIME.AnimeKai();
  return animekai;
};

const getAnimeSaturn = () => {
  if (typeof window !== 'undefined') return null;
  if (!animesaturn) animesaturn = new ANIME.AnimeSaturn();
  return animesaturn;
};

const getAnimeUnity = () => {
  if (typeof window !== 'undefined') return null;
  if (!animeunity) animeunity = new ANIME.AnimeUnity();
  return animeunity;
};

const getAnimeSama = () => {
  if (typeof window !== 'undefined') return null;
  if (!animesama) animesama = new ANIME.AnimeSama();
  return animesama;
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

async function withSuppressedScraperErrors<T>(run: () => Promise<T>): Promise<T> {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args.map((value) => String(value ?? "")).join(" ");
    if (message.includes("scrapeCardPage error")) return;
    if (message.includes("Gogoanime native fallback failed")) return;
    if (message.includes("Unexpected end of JSON input")) return;
    if (message.includes("ECONNRESET")) return;
    if (message.includes("ETIMEDOUT")) return;
    originalError(...args);
  };

  try {
    return await run();
  } catch (e: any) {
    // Also suppress from throwing if it's a known network error
    const msg = String(e?.message || "");
    if (msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT")) {
      return null as any;
    }
    throw e;
  } finally {
    console.error = originalError;
  }
}

function normalizeCompareTitle(value: string): string {
  let s = value.toLowerCase();

  // Replace roman numerals at the end of titles or after "season"
  s = s.replace(/\bseason\s+i{1,3}\b/g, (match) => {
    const len = match.split(/\s+/)[1].length;
    return `s${len}`;
  });

  // General season replacements
  s = s.replace(/\b(1st\s+season|first\s+season|season\s+1)\b/g, 's1');
  s = s.replace(/\b(2nd\s+season|second\s+season|season\s+2)\b/g, 's2');
  s = s.replace(/\b(3rd\s+season|third\s+season|season\s+3)\b/g, 's3');
  s = s.replace(/\b(4th\s+season|fourth\s+season|season\s+4)\b/g, 's4');
  s = s.replace(/\b(5th\s+season|fifth\s+season|season\s+5)\b/g, 's5');

  // Replace just standalone season indicators if not already processed
  s = s.replace(/\b(\d+)(st|nd|rd|th)\s+season\b/g, 's$1');
  s = s.replace(/\bseason\s+(\d+)\b/g, 's$1');

  // Strip non-alphanumeric but KEEP spaces so tokens don't merge incorrectly
  s = s.replace(/[^a-z0-9\s]/g, '');
  // Normalize whitespaces
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

function scoreTitleMatch(a: string, b: string): number {
  const qNorm = normalizeCompareTitle(a);
  const cNorm = normalizeCompareTitle(b);

  const qClean = qNorm.replace(/\s+/g, "");
  const cClean = cNorm.replace(/\s+/g, "");

  if (!qClean || !cClean) return 0;

  let score = 0;
  if (qClean === cClean) {
    score = 1.0;
  } else if (qClean.includes(cClean) || cClean.includes(qClean)) {
    score = 0.9;
  } else {
    let same = 0;
    const min = Math.min(qClean.length, cClean.length);
    for (let i = 0; i < min; i++) {
      if (qClean[i] === cClean[i]) same++;
    }
    score = same / Math.max(qClean.length, cClean.length);
  }

  // Adjust score based on season indicator matching
  const getSeasonTag = (str: string) => {
    const match = str.match(/\b(s\d+)\b/);
    return match ? match[1] : null;
  };

  const qSeason = getSeasonTag(qNorm);
  const cSeason = getSeasonTag(cNorm);

  if (qSeason !== cSeason) {
    // Mismatch in season tag
    score -= 0.3;
  }

  // Penalty for movie/specials mismatch
  const isQuerySpecial = /\b(movie|special|specials|ova|ona|oad)\b/i.test(a);
  const isCandidateSpecial = /\b(movie|special|specials|ova|ona|oad)\b/i.test(b);
  if (isQuerySpecial !== isCandidateSpecial) {
    score -= 0.2;
  }

  return Math.max(0, score);
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

  try {
    let bestCounts: { sub: number; dub: number } | null = null;
    let bestScore = 0;

    for (const queryTitle of variants) {
      const searchUrl = `https://anineko.to/browser?keyword=${encodeURIComponent(queryTitle.replace(/[\W_]+/g, ' '))}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Referer': 'https://anineko.to/'
        }
      });
      if (!response.ok) continue;
      const html = await response.text();
      const $ = load(html);

      $('.nv-anime-body').each((i, el) => {
        const titleLink = $(el).find('.nv-anime-title a');
        const candidateTitle = titleLink.text().trim();
        const score = Math.max(...variants.map((variant) => scoreTitleMatch(variant, candidateTitle)));

        const parent = $(el).parent();
        const cardThumb = parent.find('.nv-anime-thumb');

        let subVal = 0;
        const subBadgeText = cardThumb.find('.nv-stat-cc').text().trim();
        const subMatch = subBadgeText.match(/\d+/);
        if (subMatch) subVal = parseInt(subMatch[0]);

        let dubVal = 0;
        const dubBadgeText = cardThumb.find('.nv-stat-dub span').text().trim();
        const dubMatch = dubBadgeText.match(/\d+/);
        if (dubMatch) dubVal = parseInt(dubMatch[0]);

        const candidateCounts = {
          sub: Math.max(0, subVal),
          dub: Math.max(0, dubVal)
        };

        if (score < 0.55) return;

        const shouldReplace =
          !bestCounts ||
          score > bestScore ||
          (score === bestScore && candidateCounts.dub > bestCounts.dub);

        if (shouldReplace) {
          bestScore = score;
          bestCounts = candidateCounts;
        }
      });
    }

    if (!bestCounts) return null;

    for (const variant of variants) {
      hianimeCountsCache.set(normalizeCompareTitle(variant), bestCounts);
    }

    return bestCounts;
  } catch (err) {
    console.error("AniNeko sub/dub count resolution error:", err);
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


import { getAnimeTitle, getMangaFormat, slugify } from "./anime-utils";
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
      slug: slugify(getAnimeTitle(media.title)),
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
        media (type: ANIME, sort: ${sort}, status_in: ${statusIn}, season: $season, seasonYear: $seasonYear, isAdult: false) {
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
    let results: HeroResult[] = data?.data?.Page?.media?.map((m: AnilistNode & { bannerImage?: string, description?: string, genres?: string[] }) => ({
      id: m.id.toString(),
      title: m.title,
      slug: slugify(getAnimeTitle(m.title)),
      image: m.coverImage?.large,
      cover: m.bannerImage || m.coverImage?.large,
      description: m.description || "",
      genres: m.genres || [],
      type: m.type,
      rating: m.averageScore || 0,
      releaseDate: m.seasonYear || "2024",
      episodeNumber: getReleasedAnimeEpisodesCount(m),
      subEpisodes: getReleasedAnimeEpisodesCount(m)
    })) || [];

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
        media (season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
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
      slug: slugify(getAnimeTitle(m.title)),
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
  tags,
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
  tags?: string[];
  status?: string;
  season?: string;
  year?: number;
  format?: string;
  sort?: string;
  type?: "ANIME" | "MANGA";
}) {
  const gqlQuery = `
    query ($page: Int, $search: String, $genres: [String], $tags: [String], $status: MediaStatus, $season: MediaSeason, $seasonYear: Int, $format: MediaFormat, $sort: [MediaSort], $type: MediaType) {
      Page (page: $page, perPage: 20) {
        pageInfo { total hasNextPage }
        media (search: $search, genre_in: $genres, tag_in: $tags, status: $status, season: $season, seasonYear: $seasonYear, format: $format, type: $type, sort: $sort, isAdult: false) {
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

  const executeQuery = async (searchQuery?: string) => {
    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          query: gqlQuery,
          variables: {
            search: searchQuery || undefined,
            page,
            genres: genres?.length ? genres : undefined,
            tags: tags?.length ? tags : undefined,
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
        slug: slugify(getAnimeTitle(m.title)),
        image: m.coverImage?.large,
        type: m.type,
        rating: m.averageScore,
        episodeNumber: m.type === "MANGA" ? m.chapters : getReleasedAnimeEpisodesCount(m),
        subEpisodes: m.type === "MANGA" ? m.chapters : getReleasedAnimeEpisodesCount(m),
        countryOfOrigin: m.countryOfOrigin
      })) || [];
      results = await enrichAnimeResultsWithSubDub(results);
      return { results, hasNextPage: pageInfo?.hasNextPage || false, total: pageInfo?.total || 0 };
    } catch {
      return { results: [], hasNextPage: false, total: 0 };
    }
  };

  // 1. Run main query
  let searchRes = await executeQuery(search);

  // 2. If no results found, run fallback fuzzy checks
  if (searchRes.results.length === 0 && search) {
    const trimmed = search.trim();

    // Fallback A: Clean punctuation/symbols and normalize spacing
    const cleaned = trimmed
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned && cleaned.toLowerCase() !== trimmed.toLowerCase()) {
      const fallbackRes = await executeQuery(cleaned);
      if (fallbackRes.results.length > 0) {
        return fallbackRes;
      }
    }

    // Fallback B: Relax query by using first 3 words, then first 2 words
    const words = (cleaned || trimmed).split(/\s+/);
    if (words.length > 2) {
      const firstThree = words.slice(0, 3).join(" ");
      let fallbackRes = await executeQuery(firstThree);
      if (fallbackRes.results.length > 0) {
        return fallbackRes;
      }

      const firstTwo = words.slice(0, 2).join(" ");
      if (firstTwo !== firstThree) {
        fallbackRes = await executeQuery(firstTwo);
        if (fallbackRes.results.length > 0) {
          return fallbackRes;
        }
      }
    }
  }

  return searchRes;
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
      slug: slugify(getAnimeTitle(m.title)),
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
        media (type: ANIME, sort: [POPULARITY_DESC], isAdult: false) {
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
      slug: slugify(getAnimeTitle(m.title)),
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
    } catch { }
  }

  // 3. Fallback for slugs (Use AnimePahe as the primary detail provider for slugs)
  if (isNaN(Number(id))) {
    try {
      const pahe = getAnimePahe();
      if (pahe) return await pahe.fetchAnimeInfo(id);
    } catch { }
  }

  return null;
}

function normalizeTitle(title: string): string[] {
  // 1. Flatten curly quotes and special apostrophes for provider search compatibility
  const flatTitle = title.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\u2013|\u2014/g, "-");
  const variations = [flatTitle];
  if (flatTitle.includes(':')) variations.push(flatTitle.split(':')[0].trim());
  const seasonMatch = flatTitle.match(/(.*)\s+season\s+\d+/i);
  if (seasonMatch) variations.push(seasonMatch[1].trim());
  const partMatch = flatTitle.match(/(Part\s+\d+)/i);
  if (partMatch) variations.push(flatTitle.replace(partMatch[0], "").trim());
  const tags = ['(TV)', '(Movie)', 'UNCENSORED', 'DUB', 'SUB', '(Dub)', '(Sub)'];
  let cleanTitle = flatTitle;
  tags.forEach(tag => {
    // Simple case-insensitive replacement without regex for safety
    const index = cleanTitle.toLowerCase().indexOf(tag.toLowerCase());
    if (index !== -1) {
      cleanTitle = (cleanTitle.substring(0, index) + cleanTitle.substring(index + tag.length)).trim();
    }
  });
  if (cleanTitle !== flatTitle) variations.push(cleanTitle.trim());

  // Add raw original just in case
  if (flatTitle !== title) variations.push(title);

  return [...new Set(variations.filter(v => v.length > 2))];
}

function stripSeasonMarkers(title: string): string {
  return title
    .replace(/\bseason\s*\d+\b/gi, "")
    .replace(/\b(?:1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\s*season\b/gi, "")
    .replace(/\b\d+(?:st|nd|rd|th)\s*season\b/gi, "")
    .replace(/\b(?:part|cour)\s*\d+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

function inferAudioKind(...values: Array<string | undefined>): "dub" | "other" {
  const combined = values.filter(Boolean).join(" ").toLowerCase();
  if (/(english\s*dub|dual\s*audio|multi\s*audio|dubbed|\bdub\b)/i.test(combined)) {
    return "dub";
  }
  return "other";
}

async function attemptAniNekoStreaming(
  titleCandidates: string[],
  allVariations: string[],
  noSeasonVariations: string[],
  episodeNumber: number
): Promise<any> {
  const titleVariants = [...new Set([...titleCandidates, ...allVariations, ...noSeasonVariations])].filter(q => q && q.length > 2);
  console.log(`[AniNeko] Attempting streaming resolution for ep ${episodeNumber} with queries:`, titleVariants);

  for (const query of titleVariants) {
    try {
      const searchUrl = `https://anineko.to/browser?keyword=${encodeURIComponent(query.replace(/[\W_]+/g, ' '))}`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Referer': 'https://anineko.to/'
        }
      });
      if (!res.ok) continue;
      const html = await res.text();
      const $ = load(html);

      const results: { id: string; title: string }[] = [];
      $('.nv-anime-body').each((i, el) => {
        const titleLink = $(el).find('.nv-anime-title a');
        const title = titleLink.text().trim();
        const href = titleLink.attr('href') || '';
        const id = href.replace('/watch/', '');
        if (id) {
          results.push({ id, title });
        }
      });

      if (results.length === 0) continue;

      let bestMatch: typeof results[0] | null = null;
      let bestScore = 0;
      for (const item of results) {
        const score = Math.max(...titleVariants.map(q => scoreTitleMatch(q, item.title)));
        if (score > bestScore) {
          bestScore = score;
          bestMatch = item;
        }
      }

      if (!bestMatch || bestScore < 0.55) continue;

      console.log(`[AniNeko] Found best match: "${bestMatch.title}" (ID: ${bestMatch.id}, Score: ${bestScore})`);

      const epUrl = `https://anineko.to/watch/${bestMatch.id}/ep-${episodeNumber}`;
      console.log(`[AniNeko] Fetching episode page: ${epUrl}`);
      const epRes = await fetch(epUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Referer': `https://anineko.to/watch/${bestMatch.id}`
        }
      });
      if (!epRes.ok) {
        console.warn(`[AniNeko] Episode page not found: ${epUrl}`);
        continue;
      }

      const epHtml = await epRes.text();
      const ep$ = load(epHtml);

      const allFoundServers: any[] = [];
      ep$('button.nv-server-btn').each((i, el) => {
        const videoUrl = ep$(el).attr('data-video') || '';
        if (!videoUrl) return;

        const tab = ep$(el).attr('data-tab') || '';
        const btnText = ep$(el).text().trim().replace(/\s+/g, ' ');

        const isDub = tab === 'tab_2' || btnText.toUpperCase().includes('DUB');
        const audioKind = isDub ? 'dub' : 'other';
        const audioLabel = isDub ? 'English Dub' : 'Sub';

        const serverName = btnText.split(' ')[0] || `HD-${i + 1}`;

        allFoundServers.push({
          name: `${serverName} (${audioLabel})`,
          provider: 'AniNeko',
          url: videoUrl,
          kind: audioKind,
          label: audioLabel
        });
      });

      if (allFoundServers.length > 0) {
        console.log(`[AniNeko] Successfully resolved ${allFoundServers.length} server(s) for episode ${episodeNumber}.`);
        return {
          sources: [
            {
              url: allFoundServers[0].url,
              quality: 'auto'
            }
          ],
          allServers: allFoundServers
        };
      }
    } catch (err: any) {
      console.error(`[AniNeko] Error resolving streams:`, err.message || err);
    }
  }
  return null;
}

export async function getStreamingLinks(
  episodeId: string,
  relativeEpisodeNumber: number,
  absoluteEpisodeNumber?: number,
  animeTitle?: string | { english?: string; romaji?: string; native?: string }
) {
  const absEp = absoluteEpisodeNumber || relativeEpisodeNumber;
  const rawTitles = typeof animeTitle === 'string' ? { english: animeTitle } : animeTitle;
  const titleCandidates = [rawTitles?.english, rawTitles?.romaji, rawTitles?.native].filter(Boolean) as string[];
  const allVariations = [...new Set(titleCandidates.flatMap(t => normalizeTitle(t)))];
  const noSeasonVariations = [...new Set([
    ...allVariations.map((t) => stripSeasonMarkers(t)),
    ...titleCandidates.map((t) => stripSeasonMarkers(t))
  ].filter(Boolean))];

  // Try AniNeko.to first as a fast and stable provider
  const nekoResult = await attemptAniNekoStreaming(titleCandidates, allVariations, noSeasonVariations, absEp);
  if (nekoResult && nekoResult.sources?.length > 0) {
    return nekoResult;
  }

  const primaryTitles = [rawTitles?.english, rawTitles?.romaji].filter(Boolean) as string[];

  const attemptProvider = async (provider: any, query: string, isStrict: boolean = true): Promise<any> => {
    try {
      // Global resiliency wrapper: prevent ECONNRESET and scrape errors from crashing next.js
      const searchResults: any = await withSuppressedScraperErrors(() => withTimeout(provider.search(query), 5000)).catch(() => null);
      if (!searchResults?.results?.length) return null;

      const getResultTitle = (item: any): string => {
        if (typeof item?.title === "string") return item.title;
        return item?.title?.english || item?.title?.romaji || item?.title?.native || "";
      };

      const getSeason = (s: string) => {
        const m = s.match(/season\s*(\d+)/i) || s.match(/s(\d+)/i) || s.match(/(\d+)(?:st|nd|rd|th)\s*season/i);
        if (m) return m[1];
        if (s.includes(' 2nd ') || s.includes(' II ')) return "2";
        if (s.includes(' 3rd ') || s.includes(' III ')) return "3";
        const trailingNumber = s.match(/\b(\d{1,2})\b\s*$/);
        return trailingNumber ? trailingNumber[1] : null;
      };
      const querySeason = getSeason(query);

      // Try top 3 matches for better accuracy, prioritizing TV format
      const matches = searchResults.results.slice(0, 3);
      const sortedMatches = matches.sort((a: any, b: any) => {
        const titleA = getResultTitle(a);
        const titleB = getResultTitle(b);
        const seasonA = getSeason(titleA || "");
        const seasonB = getSeason(titleB || "");

        const scoreA = scoreTitleMatch(query, titleA || "") + ((querySeason && seasonA === querySeason) ? 0.4 : 0);
        const scoreB = scoreTitleMatch(query, titleB || "") + ((querySeason && seasonB === querySeason) ? 0.4 : 0);
        if (scoreA !== scoreB) return scoreB - scoreA;

        const isTvA = a.type === 'TV' || a.format === 'TV';
        const isTvB = b.type === 'TV' || b.format === 'TV';
        if (isTvA && !isTvB) return -1;
        if (!isTvA && isTvB) return 1;
        return 0;
      });

      for (const match of sortedMatches) {
        try {
          const info: any = await withTimeout(provider.fetchAnimeInfo(match.id), 5000);

          // 1. Seasonal Match Security: Prevent "Season 1" results for "Season 2" queries
          const matchSeason = getSeason(match.title) || getSeason(info.title || "");

          // IF query has a season, the result MUST also have that SPECIFIC season.
          if (isStrict && querySeason && (!matchSeason || querySeason !== matchSeason)) {
            console.warn(`[Streaming] Skipping ${provider.name}: Strict season mismatch (Q:${querySeason} vs R:${matchSeason || 'None'}) for match "${match.title}"`);
            continue;
          }

          // 2. Episode Range Validation
          const episodes = info.episodes || [];
          const maxEp = episodes.reduce((max: number, e: any) => Math.max(max, e.number || 0), 0);
          if (maxEp < absEp && maxEp < relativeEpisodeNumber) {
            console.warn(`[Streaming] Skipping ${provider.name}: Requested ep ${absEp} but only found up to ${maxEp} in "${match.title}"`);
            continue;
          }

          const ep = episodes.find((e: any) => e.number === absEp || e.number === relativeEpisodeNumber);
          const fallbackEp = ep || (episodes.length > 0 ? (episodes.find((e: any) => e.number === 1) || episodes[0]) : null);
          if (!fallbackEp) {
            console.warn(`[Streaming] Skipping ${provider.name}: Episode ${absEp} not found in episode list of "${match.title}"`);
            continue;
          }

          if (!ep && fallbackEp) {
            console.warn(`[Streaming] Falling back to first available episode for ${provider.name} on "${match.title}" (requested ${absEp})`);
          }

          if (fallbackEp?.id) {
            const sources: any = await withSuppressedScraperErrors(() => withTimeout(provider.fetchEpisodeSources(fallbackEp.id), 8000)).catch(() => null);
            if (sources && sources.sources?.length > 0) {
              // Validation: Check for "Throttled" or error manifest content
              const mainSource = sources.sources[0].url;
              try {
                const manifestRes = await fetch(mainSource, {
                  method: 'GET',
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': (provider.name.includes('AnimePahe') ? 'https://kwik.cx/' : 'https://megacloud.tv/'),
                    'Accept': '*/*'
                  },
                  next: { revalidate: 0 }
                });

                if (manifestRes.status === 403 || manifestRes.status === 401) {
                  console.warn(`[Streaming] Caution with ${provider.name}: Forbidden access to manifest (${manifestRes.status}). Returning source anyway.`);
                } else {
                  const text = await manifestRes.text();

                  if (!manifestRes.ok) {
                    console.log(`[Streaming] Caution with ${provider.name}: Manifest fetch status ${manifestRes.status}.`);
                  }

                  // Only reject obvious blocked pages.
                  const isThrottled = text.toLowerCase().includes('throttle') ||
                    text.toLowerCase().includes('check other episodes') ||
                    text.toLowerCase().includes('error has occurred') ||
                    text.toLowerCase().includes('forbidden') ||
                    text.toLowerCase().includes('access denied');

                  if (isThrottled) {
                    console.warn(`[Streaming] Blocking ${provider.name}: Detected blocked/throttled manifest content for ${match.id}`);
                    continue;
                  }

                  // Allow shorter manifests if they still look like media or playlist content.
                  if (text.length > 0 && text.length < 200 && !text.includes('#EXT-X-STREAM-INF') && !text.includes('#EXTINF') && !text.includes('http')) {
                    console.warn(`[Streaming] Caution with ${provider.name}: Manifest is small (${text.length}b) but still returning source for playback testing.`);
                  }
                }
              } catch (e) {
                console.warn(`[Streaming] Validator Error for ${provider.name}:`, e);
                // Best effort: return the source instead of dropping it on network validator failure.
              }
              return {
                ...sources,
                matchedTitle: match.title,
                providerName: provider.name,
                sourceQuery: query
              };
            }
          }
        } catch { continue; }
      }
    } catch { }
    return null;
  };

  const providers = [
    getAnimePahe(),
    getHianime(),
    getAnimeKai(),
    getAnimeSaturn(),
    getKickAssAnime(),
    getAnimeUnity(),
    getAnimeSama()
  ].filter(Boolean);

  const allFoundServers: any[] = [];

  // Local helper to track and format found servers
  const processFoundSources = (sources: any, p: any) => {
    if (!sources?.sources?.length) return null;

    const audioKind = inferAudioKind(
      sources.matchedTitle,
      sources.providerName,
      p?.name,
      sources.sourceQuery,
      sources.sources?.[0]?.name,
      sources.sources?.[0]?.url
    );
    const audioLabel = audioKind === "dub" ? "English Dub" : "Other";

    // Add to global server list for the UI selector
    const serverName = p.name;
    // For AnimeSama, we might have sub-players
    if (serverName === 'AnimeSama' && sources.servers) {
      sources.servers.forEach((s: any) => {
        const alias = s.name === 'Player 1' ? 'kiwi' :
          s.name === 'Player 2' ? 'telli' :
            s.name === 'Player 3' ? 'jet' : s.name;
        allFoundServers.push({
          name: alias,
          provider: 'AnimeSama',
          url: s.url,
          kind: inferAudioKind(s.name, sources.matchedTitle, sources.providerName),
          label: audioLabel
        });
      });
    } else {
      allFoundServers.push({
        name: serverName,
        provider: serverName,
        url: sources.sources[0].url,
        kind: audioKind,
        label: audioLabel
      });
    }
    return sources;
  };

  // Primary Race: Try English & Romaji concurrently (STRICT)
  // Sequential providers to avoid rate-limiting/403, but concurrent titles for speed
  for (const p of providers) {
    if (!p) continue;
    try {
      const result = await Promise.any(
        primaryTitles.map(async (t) => {
          const res = await attemptProvider(p, t, true); // Strict
          if (res) {
            console.log(`[Streaming] Success with ${p.name} (Strict) for "${t}"`);
            processFoundSources(res, p);
            return res;
          }
          return Promise.reject();
        })
      );
      if (result) return { ...result, allServers: allFoundServers };
    } catch { /* Continue to next provider */ }
  }

  // Secondary Race: Broad variations (STRICT)
  for (const p of providers) {
    if (!p) continue;
    try {
      const result = await Promise.any(
        allVariations.slice(2).map(async (v) => {
          const res = await attemptProvider(p, v, true); // Strict
          if (res) {
            console.log(`[Streaming] Success with ${p.name} (Strict Variant) for "${v}"`);
            processFoundSources(res, p);
            return res;
          }
          return Promise.reject();
        })
      );
      if (result) return { ...result, allServers: allFoundServers };
    } catch { /* Continue to next provider */ }
  }

  // Final Pass: Relaxed (Non-Strict) fallback with BASE TITLE (removes "Season X")
  const baseTitles = [...new Set([...noSeasonVariations, ...allVariations.map(t => stripSeasonMarkers(t))])];
  for (const p of providers) {
    if (!p) continue;
    try {
      const result = await Promise.any(
        baseTitles.map(async (t) => {
          const res = await attemptProvider(p, t, false); // Not strict
          if (res) {
            console.log(`[Streaming] Success with ${p.name} (Relaxed Base) for "${t}"`);
            processFoundSources(res, p);
            return res;
          }
          return Promise.reject();
        })
      );
      if (result) return { ...result, allServers: allFoundServers };
    } catch { /* Continue to next provider */ }
  }

  // Last resort: try the seasonless title with loose matching against all providers.
  const titleFallbacks = [...new Set([
    ...noSeasonVariations,
    ...primaryTitles.map((t) => stripSeasonMarkers(t)),
    ...titleCandidates.map((t) => stripSeasonMarkers(t))
  ].filter(Boolean))];
  for (const p of providers) {
    if (!p) continue;
    try {
      const result = await Promise.any(
        titleFallbacks.map(async (t) => {
          const res = await attemptProvider(p, t, false);
          if (res) {
            console.log(`[Streaming] Success with ${p.name} (Loose Fallback) for "${t}"`);
            processFoundSources(res, p);
            return res;
          }
          return Promise.reject();
        })
      );
      if (result) return { ...result, allServers: allFoundServers };
    } catch { /* Continue to next provider */ }
  }

  const displayTitle = typeof animeTitle === 'string' ? animeTitle : (animeTitle?.english || animeTitle?.romaji || episodeId);
  console.log(`[Streaming] No clean stream found for "${displayTitle}" (E:${absEp}). All providers checked.`);
  return { sources: [], allServers: [] };
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
      slug: slugify(getAnimeTitle(m.title)),
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
      slug: slugify(getAnimeTitle(m.title)),
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

function findBestMangaMatch(results: any[], queryInfo: string | { english?: string; romaji?: string; native?: string }): any {
  if (!results || results.length === 0) return null;

  // Extract all variant queries (English, Romaji, Native)
  const queries: string[] = [];
  if (typeof queryInfo === "string") {
    queries.push(queryInfo);
  } else if (queryInfo) {
    if (queryInfo.english) queries.push(queryInfo.english);
    if (queryInfo.romaji) queries.push(queryInfo.romaji);
    if (queryInfo.native) queries.push(queryInfo.native);
  }

  if (queries.length === 0) return results[0];

  const primaryQuery = queries[0];
  const queryIsColored = primaryQuery.toLowerCase().includes("colored");

  const cleanQueries = queries.map(q => q.toLowerCase().replace(/[^a-z0-9]/g, ""));

  let bestMatch = results[0];
  let highestScore = -999;

  for (const item of results) {
    const title = typeof item.title === 'string' ? item.title : item.title?.english || item.title?.romaji || "";
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Find the best match score among all clean queries
    let maxBaseScore = -1;
    for (const cleanQuery of cleanQueries) {
      let score = 0;
      if (cleanTitle === cleanQuery) {
        score = 1.0;
      } else if (cleanTitle.includes(cleanQuery) || cleanQuery.includes(cleanTitle)) {
        score = Math.min(cleanTitle.length, cleanQuery.length) / Math.max(cleanTitle.length, cleanQuery.length);
        // Cap substring score to 0.8
        if (score > 0.8) score = 0.8;
      } else {
        score = 0.2;
      }
      if (score > maxBaseScore) maxBaseScore = score;
    }

    let score = maxBaseScore;

    // Penalize colored versions if the query wasn't specifically looking for them
    const isColored = title.toLowerCase().includes("colored");
    if (isColored && !queryIsColored) {
      score -= 0.4;
    }

    // Penalize spin-offs / anthologies / extra stories
    const isSpinOff = title.toLowerCase().includes("spin-off") ||
      title.toLowerCase().includes("spinoff") ||
      title.toLowerCase().includes("anthology") ||
      title.toLowerCase().includes("novel");
    if (isSpinOff && !primaryQuery.toLowerCase().includes("spin-off") && !primaryQuery.toLowerCase().includes("spinoff")) {
      score -= 0.5;
    }

    // Prioritize ComicK canonical IDs (starting with 2 digits and a dash, e.g. 00-, 04-)
    if (score > 0.4 && /^\d{2}-/.test(item.id)) {
      score += 5.0; // Strong bonus for canonical ComicK IDs
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }
  return bestMatch;
}

async function fetchComicKAllChapters(hid: string): Promise<any[]> {
  const allChapters: any[] = [];

  try {
    // 1. Fetch the first page to get initial data and pagination info
    const firstPageRes = await fetch(`https://comick.art/api/comics/${hid}/chapter-list?lang=en&page=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://comick.art/'
      },
      next: { revalidate: 3600 }
    });

    if (firstPageRes.ok) {
      const firstPageJson = await firstPageRes.json();
      const firstPageChapters = firstPageJson.data || [];
      allChapters.push(...firstPageChapters);

      const pagination = firstPageJson.pagination;
      const lastPage = pagination?.last_page || 1;

      if (lastPage > 1) {
        const pagePromises: Promise<any[]>[] = [];
        for (let p = 2; p <= lastPage; p++) {
          pagePromises.push(
            (async () => {
              try {
                const res = await fetch(`https://comick.art/api/comics/${hid}/chapter-list?lang=en&page=${p}`, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Referer': 'https://comick.art/'
                  },
                  next: { revalidate: 3600 }
                });
                if (res.ok) {
                  const json = await res.json();
                  return json.data || [];
                }
              } catch (e) {
                console.error(`[ComicK] Error fetching chapters page ${p}:`, e);
              }
              return [];
            })()
          );
        }

        const otherPagesResults = await Promise.all(pagePromises);
        for (const pageChapters of otherPagesResults) {
          allChapters.push(...pageChapters);
        }
      }
    }
  } catch (e) {
    console.error(`[ComicK] Error in fetchComicKAllChapters:`, e);
  }

  // Deduplicate chapters by chapter number (only keep the first translation group parsed)
  const uniqueChaptersMap = new Map<string, any>();
  for (const c of allChapters) {
    const chapNum = c.chap || "";
    if (chapNum && !uniqueChaptersMap.has(chapNum)) {
      uniqueChaptersMap.set(chapNum, c);
    }
  }

  // Sort chapters ascending by chapter number
  const sortedChapters = Array.from(uniqueChaptersMap.values()).sort((a: any, b: any) => {
    return parseFloat(a.chap || "0") - parseFloat(b.chap || "0");
  });

  return sortedChapters;
}

export async function getMangaDetails(id: string) {
  try {
    const mangaInfo = await fetchAnilistDirect(id);
    if (!mangaInfo) return null;

    const isManhwa = mangaInfo.countryOfOrigin === 'KR';
    const searchTitle = typeof mangaInfo.title === 'string' ? mangaInfo.title : mangaInfo.title?.english || mangaInfo.title?.romaji || "";

    if (isManhwa) {
      // Manhwa -> use Manhwatop (represented by ComicK since it indexes Toonily/Manhwatop fully)
      console.log(`[MangaDetails] Manhwa detected. Using Manhwatop (ComicK) for search: ${searchTitle}`);
      const comick = getComicK();
      if (comick) {
        try {
          const searchResults = await comick.search(searchTitle);
          if (searchResults.results?.length > 0) {
            const bestMatch = findBestMangaMatch(searchResults.results, mangaInfo.title);
            if (bestMatch) {
              const chapters = await fetchComicKAllChapters(bestMatch.id);
              return {
                ...mangaInfo,
                chapters: chapters.map((c: any) => ({
                  id: `comick:${bestMatch.id}/${c.hid}-chapter-${c.chap}-en`,
                  title: c.title || c.chap,
                  number: c.chap,
                  volumeNumber: c.vol,
                  releaseDate: c.created_at,
                  lang: c.lang
                })).reverse() // Reverse to return latest chapter first (descending)
              };
            }
          }
        } catch (e) {
          console.error("[MangaDetails] Manhwatop (ComicK) fetch failed:", e);
        }
      }
    } else {
      // Manga -> use MangaFire (represented by ComicK) and AllManga (represented by MangaReader / MangaDex)
      console.log(`[MangaDetails] Manga detected. Attempting MangaFire (ComicK) for search: ${searchTitle}`);
      const comick = getComicK();
      if (comick) {
        try {
          const searchResults = await comick.search(searchTitle);
          if (searchResults.results?.length > 0) {
            const bestMatch = findBestMangaMatch(searchResults.results, mangaInfo.title);
            if (bestMatch) {
              const chapters = await fetchComicKAllChapters(bestMatch.id);
              if (chapters.length > 0) {
                return {
                  ...mangaInfo,
                  chapters: chapters.map((c: any) => ({
                    id: `comick:${bestMatch.id}/${c.hid}-chapter-${c.chap}-en`,
                    title: c.title || c.chap,
                    number: c.chap,
                    volumeNumber: c.vol,
                    releaseDate: c.created_at,
                    lang: c.lang
                  })).reverse() // Reverse to return latest chapter first (descending)
                };
              }
            }
          }
        } catch (e) {
          console.warn("[MangaDetails] ComicK (MangaFire) search failed, falling to AllManga:", e);
        }
      }

      // Fallback: AllManga -> MangaReader
      console.log(`[MangaDetails] Attempting AllManga (MangaReader) for search: ${searchTitle}`);
      const reader = getMangaReader();
      if (reader) {
        try {
          const searchResults = await reader.search(searchTitle);
          if (searchResults.results?.length > 0) {
            const bestMatch = findBestMangaMatch(searchResults.results, mangaInfo.title);
            if (bestMatch) {
              const fullMangaInfo = await reader.fetchMangaInfo(bestMatch.id);
              const chapters = (fullMangaInfo as any).chapters || [];
              if (chapters.length > 0) {
                // Ensure chapters are sorted descending (latest first)
                const sortedChapters = [...chapters].sort((a: any, b: any) => {
                  return parseFloat(b.number || b.chap || "0") - parseFloat(a.number || a.chap || "0");
                });

                return {
                  ...mangaInfo,
                  chapters: sortedChapters.map((c: any) => ({
                    ...c,
                    id: `mangareader:${c.id}`
                  }))
                };
              }
            }
          }
        } catch (e) {
          console.warn("[MangaDetails] MangaReader (AllManga) search failed, falling to MangaDex:", e);
        }
      }

      // Final Fallback: MangaDex
      console.log(`[MangaDetails] Attempting MangaDex fallback for search: ${searchTitle}`);
      const dex = getMangaDex();
      if (dex) {
        try {
          const searchResults = await dex.search(searchTitle);
          if (searchResults.results?.length > 0) {
            const bestMatch = findBestMangaMatch(searchResults.results, mangaInfo.title);
            if (bestMatch) {
              const fullMangaInfo = await dex.fetchMangaInfo(bestMatch.id);
              const chapters = (fullMangaInfo as any).chapters || [];

              // Ensure chapters are sorted descending (latest first)
              const sortedChapters = [...chapters].sort((a: any, b: any) => {
                return parseFloat(b.number || b.chap || "0") - parseFloat(a.number || a.chap || "0");
              });

              return {
                ...mangaInfo,
                chapters: sortedChapters.map((c: any) => ({
                  ...c,
                  id: `mangadex:${c.id}`
                }))
              };
            }
          }
        } catch (e) {
          console.error("[MangaDetails] MangaDex fallback failed:", e);
        }
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
    const decodedId = decodeURIComponent(chapterId);
    let providerName = "comick"; // default
    let realChapterId = decodedId;

    if (decodedId.includes(":")) {
      const parts = decodedId.split(":");
      providerName = parts[0];
      realChapterId = parts.slice(1).join(":");
    }

    console.log(`[MangaChapterPages] Fetching pages. Provider: ${providerName}, Chapter: ${realChapterId}`);

    if (providerName === "mangareader") {
      const reader = getMangaReader();
      if (reader) return await reader.fetchChapterPages(realChapterId);
    } else if (providerName === "mangadex") {
      const dex = getMangaDex();
      if (dex) return await dex.fetchChapterPages(realChapterId);
    } else {
      const comick = getComicK();
      if (comick) return await comick.fetchChapterPages(realChapterId);
    }
    return [];
  } catch (e) {
    console.error("Manga chapter pages fetch failed:", e);
    return [];
  }
}

export const getOngoingAnime = async (page: number = 1, perPage: number = 20, country?: string) => {
  const query = `
    query ($page: Int, $perPage: Int, $country: CountryCode) {
      Page (page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media (type: ANIME, status_in: [RELEASING], sort: [UPDATED_AT_DESC, POPULARITY_DESC], isAdult: false, countryOfOrigin: $country) {
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
          countryOfOrigin
        }
      }
    }`;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { page, perPage, country } })
    });
    const data = await response.json();
    const pageInfo = data?.data?.Page?.pageInfo;
    let results = data?.data?.Page?.media?.map((m: AnilistNode) => ({
      id: m.id.toString(),
      title: m.title,
      slug: slugify(getAnimeTitle(m.title)),
      image: m.coverImage?.large,
      type: m.type,
      rating: m.averageScore,
      countryOfOrigin: m.countryOfOrigin,
      episodeNumber: getReleasedAnimeEpisodesCount(m),
      subEpisodes: getReleasedAnimeEpisodesCount(m)
    })) || [];
    results = await enrichAnimeResultsWithSubDub(results);
    return { results, hasNextPage: pageInfo?.hasNextPage || false };
  } catch (error) {
    console.error("Failed to fetch ongoing anime:", error);
    return { results: [], hasNextPage: false };
  }
};
