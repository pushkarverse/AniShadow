import { NextResponse } from "next/server";
import { getAnimeDetails, getReaderDetails } from "@/lib/consumet";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  
  const isReaderType = type === "MANGA" || type === "MANHWA" || type === "NOVEL" || id.startsWith("novelfull-") || id.startsWith("novelbin-") || id.startsWith("witchcult-");
  
  try {
    if (isReaderType) {
      const details = await getReaderDetails(id);
      if (!details) {
        return NextResponse.json({ error: "Reader details not found" }, { status: 404 });
      }
      
      return NextResponse.json({
        id: details.id,
        title: details.title,
        description: details.description || "",
        image: details.image || "",
        cover: details.cover || "",
        rating: details.rating || 70,
        status: details.status || "RELEASING",
        genres: details.genres || [],
        type: details.type || type || "MANGA",
        chapters: details.chapters?.length || 0,
      });
    }

    const anime = await getAnimeDetails(id);
    if (!anime) {
        return NextResponse.json({ error: "Anime not found" }, { status: 404 });
    }
    
    // Return a rich object for the "Quick Info" and "Details" matching the reference image
    return NextResponse.json({
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
    return NextResponse.json({ error: "Failed to fetch info" }, { status: 500 });
  }
}
