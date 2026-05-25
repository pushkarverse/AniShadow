import { Navbar } from "@/components/Navbar";
import { HistoryTracker } from "@/components/HistoryTracker";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAnimeDetails, getStreamingLinks } from "@/lib/consumet";
import { slugify, getAnimeTitle } from "@/lib/anime-utils";
import { WatchPlayerSection } from "@/components/WatchPlayerSection";

export const dynamic = "force-dynamic";

interface WatchPageProps {
  params: Promise<{ id: string; slug: string }>;
  searchParams: Promise<{ ep?: string }>;
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { id, slug } = await params;
  const { ep = "1" } = await searchParams;
  const episodeNumber = parseInt(ep);

  try {
    const anime = await getAnimeDetails(id);
    if (!anime) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="p-10 rounded-3xl bg-white/5 border border-white/5 shadow-2xl max-w-lg text-center backdrop-blur-xl">
            <h1 className="text-3xl font-black mb-4 text-primary uppercase tracking-tighter">Stream Unavailable</h1>
            <p className="text-white/40 mb-8 leading-relaxed font-medium">
              We couldn&apos;t load the anime details. This might be due to temporary rate-limiting or an invalid ID.
            </p>
            <Link href="/" className="px-10 py-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all uppercase tracking-widest text-sm">
              Return Home
            </Link>
          </div>
        </div>
      );
    }

    // Correctly extract the title string from the ITitle object or string
    const titleString = getAnimeTitle(anime.title);
    const animeSlug = slugify(titleString);

    // Fetch streaming links with the full title object (English, Romaji, Native)
    const streamData = await getStreamingLinks(id, episodeNumber, episodeNumber, anime.title);

    const currentEpisode = anime.episodes?.find(e => e.number === episodeNumber) || anime.episodes?.[0];
    const episodeTitle = currentEpisode?.title || `Episode ${episodeNumber}`;
    const videoUrl = streamData?.sources?.find((s: any) => s.quality === 'default' || s.quality === 'auto')?.url || streamData?.sources?.[0]?.url;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <HistoryTracker 
          animeId={id} 
          title={titleString} 
          image={anime.image || ""}
          episodeNumber={episodeNumber}
          displayEpisodeNumber={episodeNumber}
          episodeTitle={episodeTitle}
        />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column: Player & Info */}
            <div className="flex-1 flex flex-col gap-6">
              <Link href={`/anime/${id}/${animeSlug}`} className="inline-flex items-center gap-2 text-white/40 hover:text-primary transition-all mb-4 group font-black uppercase tracking-widest text-[10px]">
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Series</span>
              </Link>

              <WatchPlayerSection
                videoUrl={videoUrl || ""}
                title={titleString}
                episodeTitle={episodeTitle}
                poster={anime.cover || anime.image || ""}
                description={anime.description || "No description available."}
                allServers={streamData?.allServers}
              />
            </div>

            {/* Right Column: Episode List */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
              <h3 className="text-lg font-semibold px-2">Episodes</h3>
              <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {anime.episodes?.map((episode) => (
                  <Link
                    key={episode.id}
                    href={`/watch/${id}/${animeSlug}?ep=${episode.number}`}
                    className={`flex items-center gap-4 p-3 rounded-2xl transition-all border ${
                      episode.number === episodeNumber 
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                        : "bg-white/5 border-white/5 hover:border-white/20 text-white/40 hover:text-white"
                    }`}
                  >
                    <div className="relative w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={anime.image && anime.image !== "" ? anime.image : "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iqITmI6.png"}
                        alt={episode.title || `Episode ${episode.number}`}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{episode.number}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <span className="text-sm font-medium truncate">
                        {episode.title || `Episode ${episode.number}`}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error("Watch page error:", error);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">Error loading stream</h2>
        <Link href="/" className="text-white hover:text-accent transition-colors underline underline-offset-4">Return to Home</Link>
      </div>
    );
  }
}
