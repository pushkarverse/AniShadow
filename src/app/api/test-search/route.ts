import { NextResponse } from "next/server";
import { searchNovel, getReaderDetails, fetchAnilistNovelDetails } from "@/lib/consumet";

export async function GET() {
  const query = "Classroom of the Elite";
  const searchRes = await searchNovel(query);
  const detailsRes = await getReaderDetails("anilistnovel-94970");
  const anilistDetails = await fetchAnilistNovelDetails("94970");

  return NextResponse.json({
    query,
    searchCount: searchRes.results.length,
    searchResults: searchRes.results.map((r: any) => ({ id: r.id, title: r.title })),
    anilistDetails,
    detailsResChaptersCount: detailsRes?.chapters?.length || 0,
    detailsResMappedId: detailsRes?.id || null,
  });
}
