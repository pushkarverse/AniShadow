import {
  DEFAULT_REGION,
  hostOf,
  loadRegistry,
  mergeDiscovered,
  addMirror,
  type ProviderCategory,
  type ProviderEntry,
  type RegionStatus,
} from "./registry";

/**
 * Internet discovery of anime/manga/manhwa providers.
 *
 * Region-aware searches (DuckDuckGo HTML with kl=in-in, Bing with setmkt=en-IN)
 * surface the sites people actually use right now — including from the Indian
 * internet — then each candidate is health-checked and classified. Existing
 * main providers are never modified beyond status/region bookkeeping, and a
 * blocked main provider can gain a mirror when a candidate serves it on
 * another domain.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const SEARCH_TIMEOUT_MS = 12_000;
const CHECK_TIMEOUT_MS = 12_000;
const BODY_CAP = 400_000;

interface DiscoveryQuery {
  q: string;
  category: ProviderCategory;
}

const QUERIES: DiscoveryQuery[] = [
  // anime
  { q: "working anime streaming site to watch anime subbed dubbed 2026", category: "anime" },
  { q: "gogoanime animepahe hianime working domain 2026", category: "anime" },
  { q: "anime streaming site blocked in india working alternative", category: "anime" },
  { q: "site to watch anime episodes online 2026", category: "anime" },
  // manga
  { q: "best site to read manga chapters online 2026", category: "manga" },
  { q: "manga reader site working 2026", category: "manga" },
  { q: "manga reading site working in india 2026", category: "manga" },
  // manhwa
  { q: "best site to read manhwa online 2026", category: "manhwa" },
  { q: "manhwa scanlation site working 2026", category: "manhwa" },
  { q: "manhwa reading site working in india 2026", category: "manhwa" },
];

/** Search engines, socials, legal streaming platforms, junk. */
const DENY_HOSTS = new Set([
  "google.com", "google.co.in", "bing.com", "duckduckgo.com", "yahoo.com",
  "youtube.com", "youtu.be", "facebook.com", "twitter.com", "x.com",
  "instagram.com", "reddit.com", "wikipedia.org", "quora.com",
  "telegram.org", "t.me", "discord.com", "github.com", "medium.com",
  "substack.com", "imdb.com", "myanimelist.net", "anilist.co",
  "anime-planet.com", "anidb.net", "kitsu.io", "archive.org",
  "crunchyroll.com", "netflix.com", "hulu.com", "primevideo.com",
  "amazon.com", "hidive.com", "tubi.tv", "pluto.tv", "funimation.com",
  "viz.com", "bilibili.tv", "bstation.com", "tappytoon.com",
  "webtoons.com", "kakao.com", "webnovel.com", "novelupdates.com",
  "mangapark.net", "mangadex.org", "comick.art",
]);

const DENY_SUFFIXES = [
  ".gov", ".edu", ".mil", ".int",
  "linktr.ee", "beacons.ai", "linktree.com", "carrd.co", "notion.site",
];

const EVIDENCE: Record<ProviderCategory, RegExp> = {
  anime: /watch\s+anime|anime\s+(episode|series|movie|online)|\bsubbed\b|\bdubbed\b/i,
  manga: /wp-content\/themes\/madara|read\s+(?:the\s+)?(?:latest\s+)?manga|manga\s+chapter\s+\d+|\/chapter\/\d+/i,
  manhwa: /wp-content\/themes\/madara|read\s+(?:the\s+)?(?:latest\s+)?manhwa|manhwa\s+chapter\s+\d+|\/chapter\/\d+/i,
};

const PARKED =
  /domain is for sale|buy this domain|sedoparking|godaddy\.com\/domainsearch|hugedomains|parklogic|dan\.com\/|afternic|is parked|parked free/i;

/** Rough "this could be a provider" signal for URLs/titles (pre-filter junk SERP entries). */
const PROVIDER_SIGNAL =
  /manga|manhwa|manhua|anime|comic|scan|chapter|episode|webtoon|\bread\b|watch|subbed|dubbed|fansub|otaku/i;

/** Title-token matches identify a candidate as a known main provider's mirror. */
const MIRROR_TOKENS: { id: string; tokens: string[] }[] = [
  { id: "hianime", tokens: ["hianime", "zoro"] },
  { id: "animepahe", tokens: ["animepahe"] },
  { id: "anikoto", tokens: ["anikoto"] },
  { id: "sankanime", tokens: ["sankanime"] },
  { id: "kickassanime", tokens: ["kickassanime", "kickass anime"] },
  { id: "animesaturn", tokens: ["animesaturn", "anime saturn"] },
  { id: "animeunity", tokens: ["animeunity", "anime unity"] },
  { id: "animesama", tokens: ["anime-sama", "animesama"] },
  { id: "mangareader", tokens: ["mangareader"] },
  { id: "comick", tokens: ["comick"] },
  { id: "mangadex", tokens: ["mangadex"] },
  { id: "asurascans", tokens: ["asura scans", "asurascans"] },
];

export interface DiscoverySummary {
  ok: boolean;
  error?: string;
  region: string;
  queries: number;
  candidates: number;
  checked: number;
  added: number;
  updated: number;
  mirrors: number;
  skipped: number;
  blocked: number;
  addedIds: string[];
  errors: { url: string; error: string }[];
  durationMs: number;
}

let running = false;

async function fetchText(url: string, timeoutMs: number): Promise<{ status: number; text: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "x-scrape-timeout-ms": String(timeoutMs),
    },
  });
  const text = await res.text();
  return { status: res.status, text: text.slice(0, BODY_CAP) };
}

function extractDdgUrls(html: string): string[] {
  const out: string[] = [];
  // standard redirect links: //duckduckgo.com/l/?uddg=<urlencoded>
  const re = /uddg=([^&"']+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      out.push(decodeURIComponent(m[1]));
    } catch { /* skip malformed */ }
  }
  // plain result links (no-redirect layout)
  const direct = /class="result__a"[^>]*href="(https?:\/\/[^"]+)"/g;
  while ((m = direct.exec(html))) out.push(m[1]);
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2f;|&#47;/gi, "/")
    .replace(/&quot;/g, '"');
}

function extractBingUrls(html: string): string[] {
  const out: string[] = [];

  // Scope to organic results first — widget <cite> blocks (definitions,
  // news, shopping) otherwise leak non-provider domains into candidates.
  const organic = html.split(/class="b_algo"/).slice(1).map((p) => p.slice(0, 6000));
  const scopes = organic.length ? organic : [html];

  for (const scope of scopes) {
    // 1) <cite> display URLs: "https://domain › path" (we only need origins)
    const citeRe = /<cite[^>]*>([^<]{3,140})<\/cite>/g;
    let m: RegExpExecArray | null;
    while ((m = citeRe.exec(scope))) {
      const clean = decodeEntities(m[1])
        .replace(/[›»]/g, "/")
        .replace(/…/g, "")
        .replace(/\s+/g, "")
        .replace(/\/+/g, "/")
        .trim();
      if (!clean) continue;
      const withProto = /^https?:\/\//i.test(clean) ? clean : `https://${clean.replace(/^\/+/, "")}`;
      out.push(withProto);
    }

    // 2) redirect-embedded URLs: ck links with u=a1<base64url payload>
    const b64Re = /u=a1([A-Za-z0-9_-]+)/g;
    while ((m = b64Re.exec(scope))) {
      try {
        const padded = m[1] + "=".repeat((4 - (m[1].length % 4)) % 4);
        const buf = Buffer.from(padded, "base64url");
        for (const enc of ["utf8", "utf16le"] as const) {
          if (enc === "utf16le" && buf.length % 2 !== 0) continue;
          const hit = buf.toString(enc).match(/https?:\/\/[^\s"'<>]+/);
          if (hit) {
            out.push(hit[0]);
            break;
          }
        }
      } catch { /* skip malformed */ }
    }

    // 3) plain external hrefs (some layouts still expose them)
    const hrefRe = /href="(https?:\/\/[^"]+)"/g;
    while ((m = hrefRe.exec(scope))) out.push(decodeEntities(m[1]));
  }

  return out;
}

function isDenylisted(url: string): boolean {
  const host = hostOf(url);
  if (!host) return true;
  // require a real hostname (at least one dot, sane labels)
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) || host.startsWith(".") || host.endsWith(".")) return true;
  if (DENY_HOSTS.has(host)) return true;
  if ([...DENY_HOSTS].some((d) => host.endsWith(`.${d}`))) return true;
  if (DENY_SUFFIXES.some((s) => host.endsWith(s))) return true;
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return true;
  return false;
}

function slugifyHost(host: string): string {
  return host.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function titleOf(html: string): string {
  const m = html.match(/<title[^>]*>([^<]{1,120})<\/title>/i);
  if (!m) return "";
  return m[1]
    .replace(/\s+/g, " ")
    .split(/\s+[|–—-]\s+/)[0]
    .trim();
}

function categoriesFor(
  primary: ProviderCategory,
  evidenceText: string
): ProviderCategory[] {
  const cats: ProviderCategory[] = [primary];
  for (const cat of ["anime", "manga", "manhwa"] as ProviderCategory[]) {
    if (cat !== primary && EVIDENCE[cat].test(evidenceText)) cats.push(cat);
  }
  return cats;
}

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const idx = next++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

export async function runDiscovery(opts?: {
  categories?: ProviderCategory[];
  maxChecks?: number;
  region?: string;
}): Promise<DiscoverySummary> {
  const started = Date.now();
  const region = opts?.region || DEFAULT_REGION;
  const maxChecks = Math.min(Math.max(opts?.maxChecks ?? 20, 1), 40);
  const summary: DiscoverySummary = {
    ok: false,
    region,
    queries: 0,
    candidates: 0,
    checked: 0,
    added: 0,
    updated: 0,
    mirrors: 0,
    skipped: 0,
    blocked: 0,
    addedIds: [],
    errors: [],
    durationMs: 0,
  };

  if (running) {
    summary.error = "discovery already running";
    return summary;
  }
  running = true;

  try {
    const cats = opts?.categories?.filter((c) => ["anime", "manga", "manhwa"].includes(c));
    const queries = cats?.length ? QUERIES.filter((q) => cats.includes(q.category)) : QUERIES;
    summary.queries = queries.length;

    // 1) Search (region-aware engines)
    const found = new Map<string, { url: string; category: ProviderCategory }>();
    for (const { q, category } of queries) {
      const urls: string[] = [];
      const ddg = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=${region === "IN" ? "in-in" : "us-en"}`;
      const bing = `https://www.bing.com/search?q=${encodeURIComponent(q)}&setmkt=${region === "IN" ? "en-IN" : "en-US"}&setlang=en`;
      for (const endpoint of [ddg, bing]) {
        try {
          const { status, text } = await fetchText(endpoint, SEARCH_TIMEOUT_MS);
          if (status === 202 || status === 403 || status === 429 || status === 503) {
            summary.errors.push({ url: endpoint, error: `search throttled (HTTP ${status})` });
          }
          urls.push(...(endpoint.includes("duckduckgo") ? extractDdgUrls(text) : extractBingUrls(text)));
        } catch (err) {
          summary.errors.push({ url: endpoint, error: (err as Error).message });
        }
      }
      for (const u of urls) {
        const origin = safeOrigin(u);
        if (!origin || isDenylisted(origin)) continue;
        if (!PROVIDER_SIGNAL.test(u) && !PROVIDER_SIGNAL.test(origin)) continue;
        if (!found.has(origin)) found.set(origin, { url: origin, category });
      }
    }

    const registry = loadRegistry();
    const knownHosts = new Set(
      registry.providers.map((p) => hostOf(p.baseUrl)).filter((h): h is string => !!h)
    );
    const candidates = [...found.values()].filter((c) => !found_isKnown(c.url, knownHosts));
    summary.candidates = candidates.length;

    // 2) Health-check a capped slice, collecting new entries
    const pending: ProviderEntry[] = [];
    const toCheck = candidates.slice(0, maxChecks);
    await pool(toCheck, 4, async ({ url, category }) => {
      summary.checked++;
      try {
        const { status, text } = await fetchText(url, CHECK_TIMEOUT_MS);
        const title = titleOf(text).toLowerCase();

        // Mirror of an existing main provider?
        const mirrorId = MIRROR_TOKENS.find(
          (t) => t.tokens.some((tok) => title.includes(tok))
        )?.id;
        if (mirrorId) {
          const main = registry.providers.find((p) => p.id === mirrorId);
          const useful =
            main &&
            (main.regions?.[region] === "blocked" || main.status === "down");
          if (useful && addMirror(mirrorId, url)) summary.mirrors++;
          summary.skipped++;
          return;
        }

        if (status === 404 || status === 410 || status === 451) {
          if (status === 451) summary.blocked++;
          summary.skipped++;
          return;
        }
        if (status >= 500) {
          summary.skipped++;
          return;
        }
        if (PARKED.test(text)) {
          summary.skipped++;
          return;
        }

        const botWall = status === 401 || status === 403 || status === 429;
        const evidenceOk = EVIDENCE[category].test(text) || EVIDENCE[category].test(title);
        if (!botWall && text.length < 1000) {
          summary.skipped++;
          return;
        }
        if (!botWall && !evidenceOk) {
          summary.skipped++;
          return;
        }
        // Bot-walled pages carry no readable evidence: only keep them when
        // the URL/title itself signals a provider (guards against junk SERP).
        if (botWall && !PROVIDER_SIGNAL.test(url) && !PROVIDER_SIGNAL.test(title)) {
          summary.skipped++;
          return;
        }

        const host = hostOf(url)!;
        const entry: ProviderEntry = {
          id: slugifyHost(host),
          name: titleOf(text) || host.split(".")[0],
          baseUrl: url,
          categories: categoriesFor(category, `${title}\n${text.slice(0, 50_000)}`),
          parser: null,
          main: false,
          status: status >= 500 ? "degraded" : "active",
          source: "discovery",
          regions: { [region]: "ok" as RegionStatus },
          notes: botWall ? "Bot-wall (stealth sidecar required)." : undefined,
        };
        pending.push(entry);
      } catch (err) {
        const msg = (err as Error).message || String(err);
        if (/timeout|timed out|ENOTFOUND|ECONNREFUSED|ECONNRESET|abort|network|getaddrinfo|451/i.test(msg)) {
          // Unreachable from this region — keep it as a known-blocked candidate.
          summary.blocked++;
          const host = hostOf(url);
          if (host) {
            pending.push({
              id: slugifyHost(host),
              name: host.split(".")[0],
              baseUrl: url,
              categories: [category],
              parser: null,
              main: false,
              status: "active",
              source: "discovery",
              regions: { [region]: "blocked" as RegionStatus },
              notes: `Unreachable from region ${region} at discovery time.`,
            } satisfies ProviderEntry);
          }
        } else {
          summary.errors.push({ url, error: msg });
        }
      }
    });

    // 3) Persist
    if (pending.length) {
      const res = mergeDiscovered(pending);
      summary.added = res.added;
      summary.updated = res.updated;
      summary.addedIds = pending.map((p) => p.id);
    }

    summary.ok = true;
  } catch (err) {
    summary.error = (err as Error).message;
  } finally {
    running = false;
    summary.durationMs = Date.now() - started;
  }
  return summary;
}

function safeOrigin(u: string): string | null {
  try {
    const url = new URL(u);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function found_isKnown(url: string, known: Set<string>): boolean {
  const host = hostOf(url);
  return !!host && known.has(host);
}
