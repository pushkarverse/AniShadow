import { NextResponse } from "next/server";
import { getTrendingAnime } from "@/lib/consumet";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "NOW";
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "10");

  try {
    const data = await getTrendingAnime(page, perPage, period);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Trending API Error:", error);
    return NextResponse.json({ results: [], hasNextPage: false }, { status: 500 });
  }
}
