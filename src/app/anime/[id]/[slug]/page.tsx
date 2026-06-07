// This page operates as a server component to fetch anime data

import Image from "next/image";
import Link from "next/link";
import { Play, BookOpen } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AnimeActions } from "@/components/AnimeActions";
import { getAnimeDetails, getMediaByGenre } from "@/lib/consumet";
import { slugify, getAnimeTitle } from "@/lib/anime-utils";
import { AnimeCard } from "@/components/AnimeCard";
import { CollapsibleDescription } from "@/components/CollapsibleDescription";

export const dynamic = "force-dynamic";

function getDisplayTitle(title: string | { english?: string; romaji?: string; userPreferred?: string; native?: string } | undefined): string {
  if (!title) return "Unknown";
  if (typeof title === 'string') return title;
  return title.english || title.romaji || title.userPreferred || title.native || "Unknown";
}

interface MediaTitle {
  romaji?: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}

interface Relation {
  id: string;
  relationType: string;
  title: MediaTitle | string;
  type: string;
  status: string;
  image?: string;
  coverImage?: { large: string };
  averageScore?: number;
  rating?: number;
  seasonYear?: number;
  releaseYear?: string;
  season?: string;
  episodeNumber?: number;
  chapters?: number;
}

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
}

export default async function AnimeDetailsPage({ params }: PageProps) {
  const { id, slug } = await params;
  
  if (!id) {
    return <div className="min-h-screen flex items-center justify-center text-white">ID required.</div>;
  }

  // Use a targeted cast to access properties while avoiding total 'any' where possible
  const rawData = await getAnimeDetails(id);
  const animeData = rawData as {
    id: string;
    title: MediaTitle | string;
    type?: string;
    description?: string;
    cover?: string;
    image?: string;
    rating?: number;
    status?: string;
    releaseDate?: string;
    totalEpisodes?: number;
    currentEpisode?: number;
    episodes?: { id: string; number: number; title?: string; image?: string }[];
    chapters?: number;
    genres?: string[];
    season?: string;
    seasonYear?: number;
    relations?: Relation[];
  } | null;


  if (!animeData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
        <div className="p-8 rounded-2xl bg-card gold-framed shadow-2xl max-w-lg">
          <h1 className="text-3xl font-bold mb-4 text-accent uppercase tracking-wider">Service Briefly Throttled</h1>
          <p className="text-foreground/70 mb-8 leading-relaxed">
            The external anime provider is experiencing high traffic and has temporarily limited requests. 
            This is a security measure and usually resets within **2-5 minutes**.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/anime/${id}/${slug}`} className="px-8 py-3 bg-primary text-white rounded-lg font-bold shadow-lg hover:bg-primary/90 transition-all border border-accent/20">
              Check Again
            </Link>
            <Link href="/" className="px-8 py-3 bg-card text-white/70 rounded-lg font-medium border border-white/5 hover:bg-card/80 transition-all">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const animeTitle = getDisplayTitle(animeData.title);
  const isManga = animeData.type === 'MANGA';

  const anime = {
    title: animeTitle,
    slug: slugify(animeTitle),
    description: animeData.description?.replace(/<[^>]*>?/gm, '') || "No description available.",
    coverImage: animeData.cover || animeData.image || "https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-t950K5dY4F8s.jpg",
    posterImage: animeData.image || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iqITmI6.png",
    rating: animeData.rating ? (animeData.rating / 10).toFixed(1) : "N/A",
    status: animeData.status || "Unknown",
    releaseYear: animeData.releaseDate || "Unknown",
    episodes: animeData.currentEpisode || animeData.totalEpisodes || animeData.episodes?.length || animeData.chapters || 0,
    genres: animeData.genres || [],
    season: animeData.season,
    seasonYear: animeData.seasonYear,
    type: animeData.type || "ANIME"
  };

  const episodes = animeData.episodes || [];
  
  const relations = animeData.relations || [];
  const adaptations = relations.filter((r) => r.relationType === 'ADAPTATION');
  const allOtherRelations = relations.filter((r) => r.relationType !== 'ADAPTATION');
  
  // Title-based filtering logic
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const baseTitle = normalize(anime.title);

  // Fetch media with similar genres matching the current type (Anime vs Manga)
  // and normalize them to the Relation shape used by this page.
  const similarGenreMediaRaw: Relation[] = anime.genres.length > 0
    ? (await getMediaByGenre(anime.genres, anime.type as "ANIME" | "MANGA")).map((item: any) => ({
        ...item,
        id: String(item.id),
        relationType: item.relationType || "SIMILAR",
        status: item.status || "UNKNOWN"
      }))
    : [];

  const excludedIds = new Set([id, ...adaptations.map((r) => String(r.id)), ...allOtherRelations.map((r) => String(r.id))]);

  // Separate sequels discovered in similar results
  const discoveredSequels: Relation[] = [];
  const similarMedia: Relation[] = [];

  similarGenreMediaRaw.forEach((a: Relation) => {
    if (excludedIds.has(String(a.id))) return;
    
    const aTitleStr = typeof a.title === 'string' ? a.title : (a.title.english || a.title.romaji || '');
    const t = normalize(aTitleStr);
    
    if (t.includes(baseTitle) || baseTitle.includes(t)) {
      discoveredSequels.push({
        ...a,
        relationType: 'DISCOVERED_SEQUEL' 
      });
    } else {
      similarMedia.push(a);
    }
  });

  // Split sequential vs non-sequential (Seasons vs Related Series)
  const franchiseSequreTypes = ['SEQUEL', 'PREQUEL', 'DISCOVERED_SEQUEL'];
  
  const seasonRelations = allOtherRelations.filter((r) => franchiseSequreTypes.includes(r.relationType));
  const relatedSeriesRelations = allOtherRelations.filter((r) => !franchiseSequreTypes.includes(r.relationType));

  // Global Tracker for Sections to avoid duplicate keys in the same render
  const seenIds = new Set<string>([id]);

  const processGridItems = (items: Relation[]) => {
    const unique = [];
    for (const item of items) {
      const sid = String(item.id);
      if (seenIds.has(sid)) continue;
      seenIds.add(sid);
      unique.push(item);
    }
    return unique;
  };

  const seasonMap: Record<string, number> = { 'WINTER': 0, 'SPRING': 1, 'SUMMER': 2, 'FALL': 3 };
  const chronologicalSort = (a: Relation, b: Relation) => {
    const yearA = a.seasonYear || Number(a.releaseYear) || 9999;
    const yearB = b.seasonYear || Number(b.releaseYear) || 9999;
    if (yearA !== yearB) return yearA - yearB;
    const sA = seasonMap[a.season?.toUpperCase() || ''] ?? 9;
    const sB = seasonMap[b.season?.toUpperCase() || ''] ?? 9;
    return sA - sB;
  };

  const sortedSeasons = processGridItems([...seasonRelations, ...discoveredSequels]).sort(chronologicalSort);
  const sortedRelatedSeries = processGridItems(relatedSeriesRelations).sort(chronologicalSort);
  const filteredSimilarMedia = processGridItems(similarMedia);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />

      {/* Hero Header */}
      <div className="relative w-full min-h-[70vh] flex items-end">
        <div className="absolute inset-0">
          <Image
            src={anime.coverImage}
            alt={anime.title}
            fill
            sizes="100vw"
            className="object-cover object-top opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-[#7c0000]/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
        </div>

        <div className="container relative z-10 px-6 md:px-12 mx-auto pb-20 pt-40">
          <div className="flex flex-col lg:flex-row gap-16 items-start lg:items-end">
             <div className="w-48 sm:w-56 lg:w-72 shrink-0 rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/5 group relative aspect-[2/3] ring-1 ring-white/10 mx-auto lg:mx-0">
                <Image
                  src={anime.posterImage}
                  alt="Poster"
                  fill
                  sizes="(max-width: 768px) 192px, (max-width: 1024px) 224px, 288px"
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  priority
                />
            </div>

            <div className="flex-1 space-y-8 max-w-5xl w-full">
              <div>
                <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-black mb-4 tracking-tighter leading-[0.85] text-white uppercase drop-shadow-2xl">
                  {anime.title}
                </h1>
                <div className="flex items-center gap-4">
                  <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.4em]">
                     {typeof animeData.title === 'object' ? (animeData.title.native || animeData.title.romaji) : anime.title}
                  </p>
                  <div className="h-[1px] w-12 bg-white/10" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{anime.type}</span>
                </div>
              </div>

              <div className="max-w-3xl relative">
                <CollapsibleDescription htmlContent={anime.description} />
              </div>

              <div className="flex flex-wrap items-center gap-x-12 gap-y-4 pt-4 border-t border-white/5">
                <div className="flex flex-col gap-1">
                   <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Season</span>
                   <span className="text-sm text-white/80 font-bold tracking-tight">{anime.season} {anime.seasonYear || anime.releaseYear}</span>
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Status</span>
                   <span className="text-sm text-white/80 font-bold tracking-tight capitalize">{anime.status?.toLowerCase()?.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Genres</span>
                   <span className="text-sm text-white/80 font-bold tracking-tight line-clamp-1">{anime.genres.slice(0, 3).join(' • ')}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 pt-8">
                {isManga ? (
                   <button className="flex items-center justify-between gap-8 w-full sm:w-[280px] px-8 py-5 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 group transition-all active:scale-95">
                    <span className="text-lg uppercase tracking-[0.15em] ml-2">Read now</span>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary group-hover:scale-110 transition-all shadow-lg">
                      <BookOpen className="w-5 h-5 ml-0.5" />
                    </div>
                  </button>
                ) : episodes.length > 0 ? (
                  <Link
                    href={`/watch/${id}/${anime.slug}?ep=1`} 
                    className="flex items-center justify-between gap-8 w-full sm:w-[280px] px-8 py-5 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 group transition-all active:scale-95"
                  >
                    <span className="text-lg uppercase tracking-[0.15em] ml-2">Watch now</span>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary group-hover:scale-110 transition-all shadow-lg">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </Link>
                ) : (
                  <button disabled className="flex items-center gap-2 px-8 py-4 bg-white/5 text-white/20 font-black rounded-2xl cursor-not-allowed border border-white/5 uppercase tracking-widest">
                    <Play className="w-5 h-5" />
                    <span>No Episodes</span>
                  </button>
                )}

                {/* Manga Adaptation Shortcut */}
                {!isManga && adaptations.find(r => r.type === 'MANGA') && (
                  <Link
                    href={`/reader/${adaptations.find(r => r.type === 'MANGA')?.id}/${slugify(getDisplayTitle(adaptations.find(r => r.type === 'MANGA')?.title))}`} 
                    className="flex items-center justify-between gap-8 w-full sm:w-[280px] px-8 py-5 bg-white/10 text-white font-black rounded-2xl shadow-lg hover:bg-white/20 hover:text-primary group transition-all active:scale-95 border border-white/5 manga-theme"
                  >
                    <span className="text-lg uppercase tracking-[0.15em] ml-2">Read Manga</span>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-background group-hover:scale-110 transition-all shadow-lg">
                      <BookOpen className="w-5 h-5 ml-0.5" />
                    </div>
                  </Link>
                )}
                
                <div className="flex items-center gap-3">
                   <AnimeActions 
                      animeId={id} 
                      title={anime.title} 
                      image={anime.posterImage} 
                      slug={anime.slug}
                    />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 mt-16 space-y-24 pb-24">
        {/* Adaptation Section */}
        {adaptations.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white/40 flex items-center gap-4">
               Official Adaptation
               <div className="h-[2px] flex-1 bg-white/10" />
            </h2>
            <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-x-6 md:gap-y-6 no-scrollbar momentum-scroll -mx-6 px-6 md:mx-0 md:px-0">
              {adaptations.map((rel) => {
                const isMangaRel = rel.type === 'MANGA' || rel.type === 'MANHWA' || rel.type === 'NOVEL';
                return (
                  <Link 
                    key={rel.id} 
                    href={isMangaRel ? `/reader/${rel.id}/${slugify(getDisplayTitle(rel.title))}` : `/anime/${rel.id}/${slugify(getDisplayTitle(rel.title))}`} 
                    className={`relative group overflow-hidden rounded-3xl bg-white/5 border border-white/5 hover:border-primary/40 transition-all flex h-48 shadow-xl ${isMangaRel ? 'manga-theme' : ''} w-[280px] sm:w-[320px] shrink-0 md:w-full`}
                  >
                  <div className="w-32 h-full relative shrink-0">
                    <Image 
                      src={rel.image || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=500&auto=format&fit=crop"} 
                      alt={getDisplayTitle(rel.title)} 
                      fill 
                      sizes="128px"
                      className="object-cover transition-transform group-hover:scale-105" 
                    />
                  </div>
                  <div className="flex-1 p-6 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-black text-primary tracking-[0.2em] mb-2">Original Source</span>
                    <h4 className="text-lg font-black text-white/90 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                      {getDisplayTitle(rel.title)}
                    </h4>
                    <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest">
                      {rel.type} &bull; {rel.status?.toLowerCase()?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </Link>
              );
            })}
            </div>
          </div>
        )}

        {/* Seasons */}
        {sortedSeasons.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white/40 flex items-center gap-4">
               Seasons
               <div className="h-[2px] flex-1 bg-white/10" />
            </h2>
            <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-x-6 md:gap-y-6 no-scrollbar momentum-scroll -mx-6 px-6 md:mx-0 md:px-0">
              {sortedSeasons.map((rel) => (
                <AnimeCard 
                  key={rel.id} 
                  id={rel.id} 
                  title={getDisplayTitle(rel.title)}
                  slug={slugify(getDisplayTitle(rel.title))}
                  image={rel.image || (rel.coverImage?.large) || ""}
                  rating={(rel.averageScore || 70) / 10}
                  episodeNumber={(rel as any).episodes || rel.episodeNumber}
                  subEpisodes={(rel as any).subEpisodes}
                  dubEpisodes={(rel as any).dubEpisodes}
                  type={rel.type}
                />
              ))}
            </div>
          </div>
        )}

        {/* Related Series */}
        {sortedRelatedSeries.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white/40 flex items-center gap-4">
               Related Series
               <div className="h-[2px] flex-1 bg-white/10" />
            </h2>
            <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-3 xl:grid-cols-4 md:gap-x-4 md:gap-y-4 no-scrollbar momentum-scroll -mx-6 px-6 md:mx-0 md:px-0">
              {sortedRelatedSeries.map((rel) => (
                <AnimeCard 
                  key={rel.id} 
                  id={rel.id} 
                  title={getDisplayTitle(rel.title)}
                  slug={slugify(getDisplayTitle(rel.title))}
                  image={rel.image || (rel.coverImage?.large) || ""}
                  rating={(rel.averageScore || 70) / 10}
                  episodeNumber={(rel as any).episodes || rel.episodeNumber}
                  subEpisodes={(rel as any).subEpisodes}
                  dubEpisodes={(rel as any).dubEpisodes}
                  type={rel.type}
                />
              ))}
            </div>
          </div>
        )}

        {/* Similar Genre (Thematic Recommendations matching the current media type) */}
        {filteredSimilarMedia.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white/40 flex items-center gap-4">
               Similar Genre <span className="text-[10px] normal-case tracking-normal opacity-50 ml-2">({anime.genres[0]})</span>
               <div className="h-[2px] flex-1 bg-white/10" />
            </h2>
            <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-x-6 md:gap-y-6 no-scrollbar momentum-scroll -mx-6 px-6 md:mx-0 md:px-0">
                {filteredSimilarMedia.slice(0, 20).map((item) => (
                    <AnimeCard 
                        key={item.id} 
                        id={item.id} 
                        title={getDisplayTitle(item.title)}
                        slug={slugify(getDisplayTitle(item.title))}
                        image={item.image || ""}
                        rating={(item.averageScore || (item as any).rating || 70) / 10}
                        episodeNumber={item.episodeNumber || (item as any).chapters}
                        subEpisodes={(item as any).subEpisodes}
                        dubEpisodes={(item as any).dubEpisodes}
                        type={item.type}
                    />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
