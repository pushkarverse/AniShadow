import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";
import { slugify, getAnimeTitle } from "@/lib/anime-utils";

export default function AnimeIdRedirectPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/anime/${id}/details`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const anime = data?.anime;
        if (anime) {
          const title = getAnimeTitle(anime.title);
          const slug = slugify(title);
          navigate(`/anime/${id}/${slug}`, { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      })
      .catch((e) => {
        console.error("Anime details fetch failed for redirect:", e);
        if (!cancelled) navigate("/", { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <PageLoader />
    </div>
  );
}
