import { NextResponse } from "next/server";
import { advancedSearchAnime, searchNovel } from "@/lib/consumet";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "ANIME";
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    if (type === "NOVEL") {
      const data = await searchNovel(query.trim(), page);
      return NextResponse.json(data);
    }

    const data = await advancedSearchAnime({
      query: query.trim(),
      page,
      type: (type === "MANGA" || type === "MANHWA") ? "MANGA" : "ANIME",
      countryOfOrigin: type === "MANHWA" ? "KR" : (type === "MANGA" ? "JP" : undefined),
      exact: true
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
