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
            <Link href="/anime" className="px-10 py-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all uppercase tracking-widest text-sm">
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
        <div className="hidden md:block">
          <Navbar />
        </div>
        <HistoryTracker 
          animeId={id} 
          title={titleString} 
          image={anime.image || ""}
          episodeNumber={episodeNumber}
          displayEpisodeNumber={episodeNumber}
          episodeTitle={episodeTitle}
        />
        
        <main className="flex-1 container mx-auto px-0 md:px-4 py-0 md:py-8">
          <WatchPlayerSection
            videoUrl={videoUrl || ""}
            title={titleString}
            episodeTitle={episodeTitle}
            poster={anime.cover || anime.image || ""}
            description={anime.description || "No description available."}
            allServers={streamData?.allServers}
            episodes={anime.episodes || []}
            currentEpisodeNumber={episodeNumber}
            animeId={id}
            animeSlug={animeSlug}
            anime={anime}
          />
        </main>
      </div>
    );
  } catch (error) {
    console.error("Watch page error:", error);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">Error loading stream</h2>
        <Link href="/anime" className="text-white hover:text-accent transition-colors underline underline-offset-4">Return to Home</Link>
      </div>
    );
  }
}
