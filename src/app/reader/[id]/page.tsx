import { redirect } from "next/navigation";
import { getReaderDetails } from "@/lib/consumet";
import { slugify, getAnimeTitle } from "@/lib/anime-utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MangaIdRedirectPage({ params }: Props) {
  const { id } = await params;
  let targetUrl: string | null = null;
  
  try {
    const manga = await getReaderDetails(id);
    if (manga) {
      const title = getAnimeTitle((manga as any).title);
      const slug = slugify(title);
      targetUrl = `/reader/${id}/${slug}`;
    }
  } catch (e) {
    console.error("Manga details fetch failed for redirect:", e);
  }

  if (targetUrl) {
    redirect(targetUrl);
  } else {
    redirect("/reader");
  }
}
