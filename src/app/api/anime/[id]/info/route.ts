import { NextResponse } from "next/server";
import { getAnimeDetails } from "@/lib/consumet";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
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
  } catch {
    return NextResponse.json({ error: "Failed to fetch anime info" }, { status: 500 });
  }
}
