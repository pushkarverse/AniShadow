import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Link from "@/compat/Link";
import { useSearchParams } from "@/compat/navigation";
import { PageLoader } from "@/components/PageLoader";
import CommunityWatchClient from "./CommunityWatchClient";

export default function CommunityWatchPage() {
  const { id = "", slug = "" } = useParams();
  const searchParams = useSearchParams();
  const ep = searchParams.get("ep") || "1";
  const episodeNumber = parseInt(ep);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [anime, setAnime] = useState<any>(null);
  const [streamData, setStreamData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/anime/${id}/watch?ep=${episodeNumber}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setAnime(json.anime || null);
        setStreamData(json.stream || null);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Error loading community watch page data:", e);
        if (cancelled) return;
        setError(true);
        setAnime(null);
        setStreamData(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, episodeNumber]);

  if (loading && !anime) {
    return (
      <div className="min-h-screen bg-[#080B12] flex flex-col items-center justify-center p-4">
        <PageLoader />
      </div>
    );
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
      slug={slug}
      episodeNumber={episodeNumber}
      anime={anime}
      streamData={streamData}
    />
  );
}
