import { getAnimeDetails, getReaderDetails } from "@/lib/consumet";

export async function animeInfoHandler(
    id: string,
    request: Request
): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const isReaderType = type === "MANGA" || type === "MANHWA" || type === "NOVEL" || id.startsWith("novelfull-") || id.startsWith("novelbin-") || id.startsWith("witchcult-");

  try {
    if (isReaderType) {
      const details = await getReaderDetails(id);
      if (!details) {
        return Response.json({ error: "Reader details not found" }, { status: 404 });
      }

      const chaptersCount = details.chapters?.length || 0;
      const volumesCount = (details as any).volumesCount || (details as any).volumes || 0;

      return Response.json({
        id: details.id,
        title: details.title,
        description: details.description || "",
        image: details.image || "",
        cover: details.cover || "",
        rating: details.rating || 70,
        status: details.status || "RELEASING",
        genres: details.genres || [],
        type: details.type || type || "MANGA",
        chapters: chaptersCount,
        volumes: volumesCount,
        volumesCount,
      });
    }

    const anime = await getAnimeDetails(id);
    if (!anime) {
        return Response.json({ error: "Anime not found" }, { status: 404 });
    }

    // Return a rich object for the "Quick Info" and "Details" matching the reference image
    return Response.json({
        id: anime.id,
        title: anime.title,
        description: anime.description,
        image: anime.image,
        cover: anime.cover,
        rating: anime.rating,
        status: anime.status,
        releaseDate: anime.releaseDate,
        genres: anime.genres,
        season: (anime as any).season,
        seasonYear: (anime as any).seasonYear,
        source: (anime as any).source,
        relations: (anime as any).relations,
        recommendations: (anime as any).recommendations,
        type: (anime as any).type,
        episodesCount: anime.episodes?.length || anime.totalEpisodes || 0
    });
  } catch (e) {
    console.error("Failed to fetch info:", e);
    return Response.json({ error: "Failed to fetch info" }, { status: 500 });
  }
}
