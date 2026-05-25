import { redirect } from "next/navigation";
import { getAnimeDetails } from "@/lib/consumet";
import { slugify, getAnimeTitle } from "@/lib/anime-utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AnimeIdRedirectPage({ params }: Props) {
  const { id } = await params;
  let targetUrl: string | null = null;
  
  try {
    const anime = await getAnimeDetails(id);
    if (anime) {
      const title = getAnimeTitle((anime as any).title);
      const slug = slugify(title);
      targetUrl = `/anime/${id}/${slug}`;
    }
  } catch (e) {
    console.error("Anime details fetch failed for redirect:", e);
  }

  if (targetUrl) {
    redirect(targetUrl);
  } else {
    redirect("/");
  }
}
