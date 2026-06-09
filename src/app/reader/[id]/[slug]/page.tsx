import { Navbar } from "@/components/Navbar";
import { getAnimeDetails, getPopularAnime, getReaderDetails } from "@/lib/consumet";
import { getAnimeTitle, getMangaFormat } from "@/lib/anime-utils";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Star, Calendar, Info } from "lucide-react";
import { ReaderCard } from "@/components/ReaderCard";
import { ReaderActions } from "@/components/ReaderActions";
import { ReaderProgressPosterBadge, ReaderProgressText, ReaderProgressButton } from "@/components/ReaderProgressTracker";
import { ReaderDetailTabs } from "@/components/ReaderDetailTabs";
import { CollapsibleDescription } from "@/components/CollapsibleDescription";

import { slugify } from "@/lib/anime-utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
}

export default async function MangaDetailPage({ params }: PageProps) {
  const { id, slug } = await params;
  const manga = await getReaderDetails(id) as any;

  if (!manga) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-black text-primary mb-4 uppercase italic tracking-tighter">Manga Not Found</h1>
        <p className="text-white/40 mb-8 max-w-md">The requested title could not be retrieved from our providers. Please try again later.</p>
        <Link href={`/reader/${id}/${slug}`} className="px-8 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-primary/20">Check Again</Link>
      </div>
    );
  }

  const title = getAnimeTitle(manga.title);
  const chapters = manga.chapters || [];
  const arcs = manga.arcs || [];
  const relations = (manga.relations || []).filter((r: any) => r.type !== 'ANIME');
  const recommendations = manga.recommendations || [];

  const formatText = getMangaFormat(manga.countryOfOrigin, manga.format || manga.type, id);
  const isNovel = id.startsWith("novelfull-") || id.startsWith("novelbin-") || id.startsWith("witchcult-") || formatText === 'Light Novel' || formatText === 'Web Novel';
  const themeClass = isNovel ? "novel-theme" : "manga-theme";
  const arcCount = arcs.length;

  return (
    <div className={`min-h-screen bg-background text-foreground pb-20 ${themeClass}`}>
      <Navbar />

      {/* Hero Header */}
      <div className="relative w-full min-h-[60vh] flex items-end">
        <div className="absolute inset-0">
          <Image
            src={manga.cover || manga.image || ""}
            alt={title}
            fill
            sizes="100vw"
            className="object-cover object-top opacity-20"
            priority
            loading="eager"
          />
          {isNovel && (
            <div className="absolute inset-0 bg-gradient-to-br from-[#120826]/80 via-[#080b11]/90 to-[#0d1622]/95" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent" />
        </div>

        <div className="container relative z-10 px-6 md:px-12 mx-auto pb-16 pt-32">
          <div className="flex flex-col lg:flex-row gap-12 items-start lg:items-end">
            <div className="w-48 sm:w-56 lg:w-64 shrink-0 rounded-3xl overflow-hidden shadow-2xl border border-white/5 relative aspect-[2/3] mx-auto lg:mx-0">
              <Image
                src={manga.image || ""}
                alt="Poster"
                fill
                sizes="256px"
                className="object-cover"
                priority
                loading="eager"
              />
              <ReaderProgressPosterBadge mangaId={id} />
            </div>

            <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter text-white uppercase italic">
                  {title}
                </h1>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.2em] text-primary/60">
                    <span>{getMangaFormat(manga.countryOfOrigin, manga.format || manga.type, id)}</span>
                    <div className="w-1 h-1 bg-white/10 rounded-full" />
                    <span>{manga.status?.replace(/_/g, ' ') || "Unknown"}</span>
                    <div className="w-1 h-1 bg-white/10 rounded-full" />
                    <span>{chapters.length} Chapters{arcCount > 0 ? ` · ${arcCount} Arcs` : ""}</span>
                  </div>
                  <ReaderProgressText mangaId={id} />
                </div>
              </div>

              <div className="max-w-3xl">
                <CollapsibleDescription htmlContent={manga.description || "No description available."} />
              </div>

              <div className="flex items-center gap-6 pt-6 flex-wrap">
                {chapters.length > 0 && (
                  <ReaderProgressButton 
                    mangaId={id}
                    slug={slug}
                    chapters={chapters}
                  />
                )}

                <div className="flex items-center gap-6">
                   <ReaderActions 
                      mangaId={id}
                      title={title}
                      slug={slug}
                      image={manga.image || ""}
                   />
                   
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Score</span>
                     <div className="flex items-center gap-2 text-primary">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-lg font-black italic">{(manga.rating || 85) / 10}</span>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 mt-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Chapter List */}
          <div className="flex-1">
            <ReaderDetailTabs
              mangaId={id}
              slug={slug}
              title={manga.title}
              volumesCount={manga.volumesCount}
              chapters={chapters}
              arcs={arcs}
              isNovel={isNovel}
            />
          </div>

          {/* Sidebar Info */}
          <aside className="w-full lg:w-96 shrink-0 space-y-8">
            <div className="p-8 bg-card/40 border border-white/5 rounded-[2.5rem] space-y-8">
              <h3 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-3">
                 <div className="w-2 h-2 bg-primary rounded-full shadow-[var(--shadow-primary)]" />
                 Media Details
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white/5 text-primary">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-0.5">Release Date</span>
                    <span className="text-sm font-bold text-white/80">{manga.releaseDate || "2024"}</span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-white/5 text-primary">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block mb-0.5">Genres</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {manga.genres?.map((genre: string, idx: number) => (
                        <span key={`${genre}-${idx}`} className="px-2 py-0.5 bg-white/5 text-[10px] font-black text-white/60 rounded-md uppercase tracking-tight">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {relations.length > 0 && (
                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block">Relations</span>
                     {relations.slice(0, 3).map((rel: any, idx: number) => {
                       const relTitle = getAnimeTitle(rel.title);
                       const relSlug = slugify(relTitle);
                       return (
                         <Link key={`rel-${rel.id || idx}-${idx}`} href={rel.type === 'MANGA' ? `/reader/${rel.id}/${relSlug}` : `/anime/${rel.id}/${relSlug}`} className="flex items-center gap-3 group">
                           <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 relative shrink-0">
                             <Image src={rel.image || ""} alt="" fill sizes="48px" className="object-cover" />
                           </div>
                           <div>
                             <h5 className="text-xs font-black text-white/70 group-hover:text-primary transition-colors line-clamp-2">{relTitle}</h5>
                             <span className="text-[10px] font-black text-primary/50 uppercase tracking-widest">{rel.type === 'ANIME' ? 'Watch Now' : 'Read Now'}</span>
                           </div>
                         </Link>
                       );
                     })}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 mt-20">
        {recommendations.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white/40 flex items-center gap-4">
               Similar Manga
               <div className="h-[2px] flex-1 bg-white/10" />
            </h2>
            <div className="flex overflow-x-auto gap-4 pb-6 md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-x-6 md:gap-y-6 no-scrollbar momentum-scroll -mx-6 px-6 md:mx-0 md:px-0">
              {recommendations.map((rec: any, idx: number) => (
                <ReaderCard 
                  key={`rec-${rec.id || idx}-${idx}`}
                  id={rec.id}
                  title={getAnimeTitle(rec.title)}
                  slug={slugify(getAnimeTitle(rec.title))}
                  image={rec.image}
                  rating={8.5}
                  type={rec.type}
                  countryOfOrigin={rec.countryOfOrigin}
                  chapters={rec.chapters}
                  chapterNumber={rec.chapters}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
