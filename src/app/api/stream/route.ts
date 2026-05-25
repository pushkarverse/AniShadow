import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Enhanced M3U8 Rewriter for Kwik/AnimePahe
 */
function rewriteM3u8(content: string, originalUrl: string, referer?: string): string {
    const urlObj = new URL(originalUrl);
    const baseUrl = originalUrl.substring(0, originalUrl.lastIndexOf("/") + 1);
    const proxyBaseUrl = "/api/stream";

    // Detect if this is actually a manifest and not an obfuscated JS blob
    if (!content.includes("#EXTM3U") && content.includes("eval(function")) {
        return content;
    }

    const lines = content.split("\n");
    const rewrittenLines: string[] = [];
    let lastSegmentNum = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;

        // 1. Handle Media Sequence (Strictly for AES-128 IV calculation if missing)
        if (line.startsWith("#EXT-X-MEDIA-SEQUENCE")) {
            rewrittenLines.push(line);
            continue;
        }

        // 2. Handle Key and Map lines (Quoted URIs)
        if (line.startsWith("#EXT-X-KEY") || line.startsWith("#EXT-X-MAP")) {
            const processedLine = line.replace(/URI=(?:["']([^"']+)["']|([^,\s]+))/g, (match, quotedUrl, unquotedUrl) => {
                const relUrl = quotedUrl || unquotedUrl;
                try {
                    const absolute = new URL(relUrl, baseUrl).href;
                    const proxied = `${proxyBaseUrl}?url=${encodeURIComponent(absolute)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`;
                    return match.includes('"') || match.includes("'") ? `URI="${proxied}"` : `URI=${proxied}`;
                } catch { return match; }
            });
            rewrittenLines.push(processedLine);
            continue;
        }

        // 3. Handle Media Segments
        if (!line.startsWith("#")) {
            try {
                const absoluteUrl = new URL(line, baseUrl).href;
                
                // Track segment gaps for debug
                const match = line.match(/segment-(\d+)/);
                if (match) {
                    const currentNum = parseInt(match[1]);
                    if (lastSegmentNum !== -1 && currentNum > lastSegmentNum + 1) {
                        // Attempt to patch gaps with short dummy segments if needed
                        for (let gap = lastSegmentNum + 1; gap < currentNum; gap++) {
                            // rewrittenLines.push(`#EXTINF:0.1,`);
                            // rewrittenLines.push(`${proxyBaseUrl}?url=https://invalid-asset.com/empty.ts`);
                        }
                    }
                    lastSegmentNum = currentNum;
                }

                rewrittenLines.push(`${proxyBaseUrl}?url=${encodeURIComponent(absoluteUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`);
            } catch {
                rewrittenLines.push(line);
            }
            continue;
        }

        // 4. Default
        rewrittenLines.push(line);
    }

    return rewrittenLines.join("\n");
}

async function handleResponse(response: Response, url: string, referer: string) {
    const contentType = (response.headers.get("Content-Type") || "").toLowerCase();
    
    const isM3u8 = contentType.includes("mpegurl") || contentType.includes("mpeg-url") || url.split('?')[0].endsWith(".m3u8");
    const isKey = url.includes(".key") || url.includes("mon.key") || contentType.includes("octet-stream");
    const isSegment = url.includes("segment-") || url.includes(".ts") || url.includes(".jpg") || url.includes(".png") || url.includes(".mp4");


    const responseHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": contentType || "application/octet-stream",
      "Accept-Ranges": "bytes"
    };

    if (response.headers.get("Content-Range")) responseHeaders["Content-Range"] = response.headers.get("Content-Range")!;
    if (response.headers.get("Content-Length")) responseHeaders["Content-Length"] = response.headers.get("Content-Length")!;

    if (isM3u8) {
      const text = await response.text();
      if (text.includes("#EXTM3U") || text.includes("eval(function")) {
          const rewritten = rewriteM3u8(text, url, referer);
          responseHeaders["Content-Type"] = "application/vnd.apple.mpegurl";
          delete responseHeaders["Content-Length"];
          return new NextResponse(rewritten, { headers: responseHeaders });
      } else {
          return new NextResponse(text, { headers: responseHeaders });
      }
    }

    if (isKey) {
        const keyBuffer = await response.arrayBuffer();
        responseHeaders["Content-Type"] = "application/octet-stream";
        delete responseHeaders["Accept-Ranges"];
        delete responseHeaders["Content-Length"]; 
        return new NextResponse(new Uint8Array(keyBuffer), { 
            status: 200,
            headers: responseHeaders 
        });
    }

    if (isSegment && !isM3u8) {
        responseHeaders["Content-Type"] = "video/mp2t";
        delete responseHeaders["Content-Length"];
    }

    return new NextResponse(response.body, { 
        status: response.status === 206 ? 206 : 200, 
        headers: responseHeaders 
    });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const manualReferer = searchParams.get("referer");
  const method = req.method;

  if (!url) return new NextResponse("Missing URL", { status: 400 });

  try {
    const defaultReferer = manualReferer || (
        (url.includes("owocdn") || url.includes("kwik.cx") || url.includes("animepahe") || url.includes("streampeaker.org")) ? "https://kwik.cx/" : 
        url.includes("kaas") ? "https://kaas.to/" : 
        url.includes("uwucdn") ? "https://megacloud.tv/" : 
        url.includes("animeunity") ? "https://www.animeunity.tv/" :
        url.includes("animesama") ? "https://anime-sama.me/" :
        new URL(url).origin
    );
    
    const referersToTry = [defaultReferer];
    if (url.includes("uwucdn") || url.includes("megacloud")) {
        referersToTry.push("https://megacloud.tv"); // First priority
        referersToTry.push("https://rabbitstream.net");
        referersToTry.push("https://megacloud.tv/");
        referersToTry.push("https://rabbitstream.net/");
        referersToTry.push("https://hianime.to/");
        referersToTry.push("https://megacloud.top/");
        referersToTry.push("");
    } else {
        referersToTry.push("");
    }
    
    // Some CDNs DON'T like Origin if it's the exact same as Referer in a proxy context
    const isUwU = url.includes("uwucdn") || url.includes("megacloud");

    const forwarded = req.headers.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(',')[0] : "1.1.1.1";
    const clientUA = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    const headers: Record<string, string> = {
      "User-Agent": clientUA,
      "X-Forwarded-For": clientIp,
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "Sec-Fetch-Dest": "empty",
      "Accept": "*/*",
      "Accept-Encoding": "identity",
      "Connection": "keep-alive",
      "Cache-Control": "no-cache"
    };

    const range = req.headers.get("range");
    if (range) headers["Range"] = range;

    let response: Response | null = null;
    let finalReferer = defaultReferer;

    for (const ref of referersToTry) {
        if (ref === "") {
            delete headers["Referer"];
            delete headers["Origin"];
        } else {
            headers["Referer"] = ref;
            if (isUwU) {
                delete headers["Origin"]; // MegaCloud anti-bot hates Origin in proxy!
            } else {
                try {
                    headers["Origin"] = new URL(ref).origin;
                } catch {
                    headers["Origin"] = ref;
                }
            }
        }

        response = await fetch(url, { method, headers });
        if (response.ok || response.status === 206) {
            console.log(`[Proxy] Success: ${url.substring(0, 50)}... with referer: ${ref || 'None'}`);
            finalReferer = ref;
            break;
        } else {
            console.warn(`[Proxy] Failed: ${url.substring(0, 50)}... Status: ${response.status} with referer: ${ref || 'None'}`);
        }
    }

    if (!response || (!response.ok && response.status !== 206)) {
        return new NextResponse(null, { status: response?.status || 500 });
    }

    return await handleResponse(response, url, finalReferer);
  } catch (e) {
    return new NextResponse(null, { status: 500 });
  }
}

export async function HEAD(req: NextRequest) {
    return await GET(req);
}
