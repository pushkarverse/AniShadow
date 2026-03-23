import Link from "next/link";
import { getAnimeDetails, getStreamingLinks } from "@/lib/consumet";
import CommunityWatchClient from "./CommunityWatchClient";

export const dynamic = "force-dynamic";

interface CommunityWatchPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string }>;
}

export default async function CommunityWatchPage({ params, searchParams }: CommunityWatchPageProps) {
  const { id } = await params;
  const { ep = "1" } = await searchParams;
  const episodeNumber = parseInt(ep);
  
  let anime = null;
  let streamData: any = null;
  let error = null;

  try {
    anime = await getAnimeDetails(id);
    if (anime) {
      const titleString = typeof anime.title === 'string' 
          ? anime.title 
          : (anime.title.english || anime.title.romaji || anime.title.native || "Unknown Anime");
      streamData = await getStreamingLinks(id, episodeNumber, episodeNumber, titleString);
    }
  } catch (e) {
    console.error("Error loading community watch page data:", e);
    error = e;
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-[#080B12] flex flex-col items-center justify-center p-4">
        <div className="p-10 rounded-3xl bg-white/5 border border-white/5 shadow-2xl max-w-lg text-center backdrop-blur-xl">
          <h1 className="text-3xl font-black mb-4 text-amber-500 uppercase tracking-tighter">
            {error ? "System Error" : "Room Unavailable"}
          </h1>
          <p className="text-white/40 mb-8 leading-relaxed font-medium">
            {error 
              ? "We encountered an issue while setting up your watch room. Please try refreshing."
              : "We couldn't load the community room. Try again later."}
          </p>
          <Link href="/community" className="px-10 py-4 bg-amber-600 text-white rounded-xl font-black shadow-lg shadow-amber-900/20 hover:bg-amber-500 transition-all uppercase tracking-widest text-sm">
            {error ? "Back to Hub" : "Return to Community"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CommunityWatchClient 
      id={id}
      episodeNumber={episodeNumber}
      anime={anime}
      streamData={streamData}
    />
  );
}
