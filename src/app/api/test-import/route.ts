import { NextResponse } from "next/server";

export async function GET() {
  const report: Record<string, any> = {};

  // Test got-scraping import
  try {
    const gotScrapingModule = await import("got-scraping");
    report.gotScraping = {
      success: true,
      hasGotScraping: typeof gotScrapingModule.gotScraping === "function"
    };
  } catch (e: any) {
    report.gotScraping = {
      success: false,
      error: e.message || e.toString(),
      stack: e.stack
    };
  }

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

  return NextResponse.json(report);
}
