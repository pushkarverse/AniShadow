import { NextRequest, NextResponse } from "next/server";
import { gotScraping } from "got-scraping";

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
    const gotHeaders: Record<string, string> = {};
    if (referer) gotHeaders["Referer"] = referer;
    if (range) gotHeaders["Range"] = range;

    const method = req.method;

    let body: Buffer;
    let status = 200;
    let contentType = "";
    let contentRange = "";
    let contentLength = "";

    try {
      const gotResponse = await gotScraping({
        url,
        method: method as any,
        headers: gotHeaders,
        responseType: "buffer",
        retry: { limit: 0 },
        followRedirect: true
      });
      status = gotResponse.statusCode;
      body = gotResponse.body;
      contentType = gotResponse.headers["content-type"] || "";
      contentRange = gotResponse.headers["content-range"] || "";
      contentLength = gotResponse.headers["content-length"] || "";
    } catch (gotError: any) {
      if (gotError.response) {
        status = gotError.response.statusCode;
        body = gotError.response.body;
        contentType = gotError.response.headers["content-type"] || "";
        contentRange = gotError.response.headers["content-range"] || "";
        contentLength = gotError.response.headers["content-length"] || "";
      } else {
        // Fallback to fetch if gotScraping fails completely on socket connection errors
        const fetchHeaders: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": referer,
          "X-Forwarded-For": "1.1.1.1",
        };
        if (range) fetchHeaders["Range"] = range;
        
        const fetchResponse = await fetch(url, { method, headers: fetchHeaders });
        const arrayBuf = await fetchResponse.arrayBuffer();
        body = Buffer.from(arrayBuf);
        status = fetchResponse.status;
        contentType = fetchResponse.headers.get("Content-Type") || "";
        contentRange = fetchResponse.headers.get("Content-Range") || "";
        contentLength = fetchResponse.headers.get("Content-Length") || "";
      }
    }

    if (status === 403 && gotHeaders["Referer"]) {
      // Retry without referer
      delete gotHeaders["Referer"];
      try {
        const gotResponse = await gotScraping({
          url,
          method: method as any,
          headers: gotHeaders,
          responseType: "buffer",
          retry: { limit: 0 },
          followRedirect: true
        });
        status = gotResponse.statusCode;
        body = gotResponse.body;
        contentType = gotResponse.headers["content-type"] || "";
        contentRange = gotResponse.headers["content-range"] || "";
        contentLength = gotResponse.headers["content-length"] || "";
      } catch (gotError: any) {
        if (gotError.response) {
          status = gotError.response.statusCode;
          body = gotError.response.body;
          contentType = gotError.response.headers["content-type"] || "";
          contentRange = gotError.response.headers["content-range"] || "";
          contentLength = gotError.response.headers["content-length"] || "";
        }
      }
    }

    if (status !== 200 && status !== 206) {
      return new NextResponse(null, { status });
    }

    const isM3u8 = (contentType || "").includes("mpegurl") || (contentType || "").includes("mpeg-url") || url.toLowerCase().includes(".m3u8");

    const responseHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": contentType || "application/octet-stream"
    };

    if (contentRange) responseHeaders["Content-Range"] = contentRange;
    if (contentLength) responseHeaders["Content-Length"] = contentLength;

    if (isM3u8) {
      const text = body.toString("utf-8");
      if (text.includes("#EXTM3U")) {
          const rewritten = rewriteM3u8(text, url, referer);
          responseHeaders["Content-Type"] = "application/vnd.apple.mpegurl";
          delete responseHeaders["Content-Length"];
          return new NextResponse(rewritten, { headers: responseHeaders });
      } else {
          return new NextResponse(text, { headers: responseHeaders });
      }
    }

    return new NextResponse(new Uint8Array(body), {
      status: status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (e) {
    return new NextResponse(null, { status: 500 });
  }
}
