import { advancedSearchAnime, searchNovel } from "@/lib/consumet";

export async function searchHandler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "ANIME";
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;

  if (!query.trim()) {
    return Response.json({ results: [] });
  }

  try {
    if (type === "NOVEL") {
      const data = await searchNovel(query.trim(), page);
      return Response.json(data);
    }

    const data = await advancedSearchAnime({
      query: query.trim(),
      page,
      type: (type === "MANGA" || type === "MANHWA") ? "MANGA" : "ANIME",
      countryOfOrigin: type === "MANHWA" ? "KR" : (type === "MANGA" ? "JP" : undefined)
    });
    return Response.json(data);
  } catch (error) {
    console.error("Search API Error:", error);
    return Response.json({ results: [] }, { status: 500 });
  }
}
