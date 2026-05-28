import { NextResponse } from "next/server";
import { advancedSearchAnime } from "@/lib/consumet";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "ANIME";

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await advancedSearchAnime({
      query: query.trim(),
      page: 1,
      type: type === "MANGA" ? "MANGA" : "ANIME"
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
