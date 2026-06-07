import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("Dynamically importing consumet.ts...");
    const consumet = await import("@/lib/consumet");
    console.log("Successfully imported! Calling getTrendingAnime...");
    const data = await consumet.getTrendingAnime(1, 5);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Test Consumet Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || String(error),
      stack: error.stack
    }, { status: 500 });
  }
}
