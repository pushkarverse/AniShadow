import { NextResponse } from "next/server";

async function checkUrl(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      cache: "no-store"
    });
    const text = await res.text();
    const isBlocked = text.includes("Cloudflare") || text.includes("Just a moment");
    return {
      url,
      status: res.status,
      length: text.length,
      isBlocked,
      success: res.ok && !isBlocked
    };
  } catch (err: any) {
    return {
      url,
      error: err.message || err.toString()
    };
  }
}

export async function GET() {
  const results = await Promise.all([
    checkUrl("https://novelfull.com/hot-novel"),
    checkUrl("https://novelfull.net/hot-novel"),
    checkUrl("https://novelbin.com/search"),
    checkUrl("https://novelbin.net/search"),
    checkUrl("https://novelbin.me/search")
  ]);

  return NextResponse.json({ results });
}
