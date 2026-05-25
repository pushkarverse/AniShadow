import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function rewriteM3u8(content: string, originalUrl: string, referer?: string): string {
  const urlObj = new URL(originalUrl);
  const baseUrl = originalUrl.substring(0, originalUrl.lastIndexOf("/") + 1);
  const proxyBaseUrl = "/api/proxy";

  let rewritten = content.replace(/^(?!#)(.*)$/gm, (line) => {
    const trimmedLine = line.trim();
    if (trimmedLine === "") return line;
    
    let absoluteUrl;
    try {
        if (trimmedLine.startsWith("http")) {
            absoluteUrl = trimmedLine;
        } else if (trimmedLine.startsWith("//")) {
            absoluteUrl = urlObj.protocol + trimmedLine;
        } else if (trimmedLine.startsWith("/")) {
            absoluteUrl = urlObj.origin + trimmedLine;
        } else {
            absoluteUrl = baseUrl + trimmedLine;
        }
    } catch {
        return line;
    }

    return `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`;
  });

  rewritten = rewritten.replace(/URI=["']([^"']+)["']/g, (match, relUrl) => {
    let absoluteUrl;
    try {
        if (relUrl.startsWith("http")) {
            absoluteUrl = relUrl;
        } else if (relUrl.startsWith("//")) {
            absoluteUrl = urlObj.protocol + relUrl;
        } else if (relUrl.startsWith("/")) {
            absoluteUrl = relUrl.startsWith("/") ? urlObj.origin + relUrl : baseUrl + relUrl;
        } else {
            absoluteUrl = baseUrl + relUrl;
        }
    } catch {
        return match;
    }
    const proxiedUrl = `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`;
    return `URI="${proxiedUrl}"`;
  });

  rewritten = rewritten.replace(/mp4a\.40\.1/gi, "mp4a.40.2");

  return rewritten;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const manualReferer = searchParams.get("referer");

  if (!url) return new NextResponse("Missing URL", { status: 400 });

  try {
    const referer = manualReferer || (
      url.includes("owocdn") ? "https://kwik.cx/" : 
      url.includes("kaas") ? "https://kaas.to/" : 
      url.includes("tech20hub") ? "https://animekai.to/" : 
      url.includes("comick") ? "https://comick.art/" : 
      url.includes("mangadex") ? "https://mangadex.org/" : 
      url.includes("mangareader") ? "https://mangareader.to/" : 
      new URL(url).origin
    );
    
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": referer,
      "X-Forwarded-For": "1.1.1.1",
    };

    const range = req.headers.get("range");
    if (range) headers["Range"] = range;

    const method = req.method;
    let response = await fetch(url, { method, headers });
    if (response.status === 403) {
        delete headers["Referer"];
        response = await fetch(url, { method, headers });
    }

    if (!response.ok && response.status !== 206) {
        return new NextResponse(null, { status: response.status });
    }

    const contentType = (response.headers.get("Content-Type") || "").toLowerCase();
    const isM3u8 = contentType.includes("mpegurl") || contentType.includes("mpeg-url") || url.toLowerCase().includes(".m3u8");

    const responseHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": contentType || "application/octet-stream"
    };

    if (response.headers.get("Content-Range")) responseHeaders["Content-Range"] = response.headers.get("Content-Range")!;
    if (response.headers.get("Content-Length")) responseHeaders["Content-Length"] = response.headers.get("Content-Length")!;

    if (isM3u8) {
      const text = await response.text();
      if (text.includes("#EXTM3U")) {
          const rewritten = rewriteM3u8(text, url, referer);
          responseHeaders["Content-Type"] = "application/vnd.apple.mpegurl";
          delete responseHeaders["Content-Length"];
          return new NextResponse(rewritten, { headers: responseHeaders });
      } else {
          return new NextResponse(text, { headers: responseHeaders });
      }
    }

    return new NextResponse(response.body, {
      status: response.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (e) {
    return new NextResponse(null, { status: 500 });
  }
}
