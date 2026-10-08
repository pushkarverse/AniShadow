import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageLoader } from "@/components/PageLoader";
import { slugify, getAnimeTitle } from "@/lib/anime-utils";

export default function MangaIdRedirectPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/reader/details/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const details = data?.details;
        if (details) {
          const title = getAnimeTitle(details.title);
          const slug = slugify(title);
          navigate(`/reader/${id}/${slug}`, { replace: true });
        } else {
          navigate("/reader", { replace: true });
        }
      })
      .catch((e) => {
        console.error("Manga details fetch failed for redirect:", e);
        if (!cancelled) navigate("/reader", { replace: true });
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
