import { NextResponse } from "next/server";
// Dynamically import getTrendingAnime inside the handler to prevent module-level import crashes from blocking the rest of the diagnostics.


export async function GET() {
  const report: Record<string, any> = {};

  // Test cheerio import
  try {
    const cheerioModule = await import("cheerio");
    report.cheerio = {
      success: true,
      hasLoad: typeof cheerioModule.load === "function"
    };
  } catch (e: any) {
    report.cheerio = {
      success: false,
      error: e.message || e.toString(),
      stack: e.stack
    };
  }

  // Test @consumet/extensions import
  try {
    const consumetModule = await import("@consumet/extensions");
    report.consumet = {
      success: true,
      keys: Object.keys(consumetModule)
    };
  } catch (e: any) {
    report.consumet = {
      success: false,
      error: e.message || e.toString(),
      stack: e.stack
    };
  }

  // Test database URL check (mongodb.ts)
  try {
    const dbModule = await import("@/lib/mongodb");
    report.mongodb = {
      success: true
    };
  } catch (e: any) {
    report.mongodb = {
      success: false,
      error: e.message || e.toString(),
      stack: e.stack
    };
  }

  // Test getTrendingAnime execution
  try {
    const { getTrendingAnime } = await import("@/lib/consumet");
    const animeData = await getTrendingAnime(1, 1);
    report.getTrendingAnime = {
      success: true,
      resultsCount: animeData?.results?.length || 0
    };
  } catch (e: any) {
    report.getTrendingAnime = {
      success: false,
      error: e.message || e.toString(),
      stack: e.stack
    };
  }

  return NextResponse.json(report);
}
