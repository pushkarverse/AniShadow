import { getTrendingAnime } from "@/lib/consumet";

export async function trendingHandler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "NOW";
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "10");

  try {
    const data = await getTrendingAnime(page, perPage, period);
    return Response.json(data);
  } catch (error) {
    console.error("Trending API Error:", error);
    return Response.json({ results: [], hasNextPage: false }, { status: 500 });
  }
}
