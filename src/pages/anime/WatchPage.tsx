import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { HistoryTracker } from "@/components/HistoryTracker";
import Link from "@/compat/Link";
import { slugify, getAnimeTitle } from "@/lib/anime-utils";
import { WatchPlayerSection } from "@/components/WatchPlayerSection";
import { PageLoader } from "@/components/PageLoader";
import { useSearchParams } from "@/compat/navigation";

export default function WatchPage() {
  const { id = "", slug = "" } = useParams();
  const searchParams = useSearchParams();
  const ep = searchParams.get("ep") || "1";
  const episodeNumber = parseInt(ep);

  const [data, setData] = useState<{ anime: any; stream: any } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/anime/${id}/watch?ep=${episodeNumber}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setData({ anime: json.anime || null, stream: json.stream || null });
          setLoaded(true);
        }
      })
      .catch((error) => {
        console.error("Watch page error:", error);
        if (!cancelled) {
          setData({ anime: null, stream: null });
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, episodeNumber]);

  if (!loaded || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="hidden md:block">
          <Navbar />
        </div>
        <main className="flex-1 container mx-auto px-0 md:px-4 py-0 md:py-8">
          <PageLoader />
        </main>
      </div>
    );
  }

  const { anime, stream } = data;

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

  const currentEpisode = anime.episodes?.find((e: any) => e.number === episodeNumber) || anime.episodes?.[0];
  const episodeTitle = currentEpisode?.title || `Episode ${episodeNumber}`;
  const videoUrl = stream?.sources?.find((s: any) => s.quality === 'default' || s.quality === 'auto')?.url || stream?.sources?.[0]?.url;

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
          allServers={stream?.allServers}
          episodes={anime.episodes || []}
          currentEpisodeNumber={episodeNumber}
          animeId={id}
          animeSlug={animeSlug}
          anime={anime}
        />
      </main>
    </div>
  );
}
