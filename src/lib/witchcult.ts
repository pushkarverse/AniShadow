import { load } from "cheerio";
import { gotScraping } from "got-scraping";
import { slugify } from "./anime-utils";
import { REZERO_BANNER, REZERO_COVER, WITCHCULT_NOVEL_ID } from "./rezero";

export { REZERO_BANNER, REZERO_COVER, WITCHCULT_NOVEL_ID } from "./rezero";

const WITCHCULT_BASE_URL = "https://witchculttranslation.com";
const WITCHCULT_TOC_URL = `${WITCHCULT_BASE_URL}/table-of-content/`;

const ALLOWED_CHAPTER_HOSTS = new Set([
  "witchculttranslation.com",
  "eminenttranslations.com"
]);

/** Fallback arc pages when the homepage uses non-standard link text (e.g. "SNUTranslation"). */
const EARLY_ARC_PAGES: Record<number, { url: string; title: string }> = {
  1: { url: `${WITCHCULT_BASE_URL}/arc-1/`, title: "A Day in the Capital" },
  2: { url: WITCHCULT_TOC_URL, title: "A Week at the Mansion" },
  3: { url: WITCHCULT_TOC_URL, title: "Return to the Capital" }
};

export interface ReaderArcChapter {
  id: string;
  number: string;
  title: string;
  arc: number;
  arcTitle: string;
  chapterInArc: number;
  releaseDate?: string;
}

export interface ReaderArc {
  number: number;
  title: string;
  url: string;
  chapters: ReaderArcChapter[];
}

export function getWitchCultNovelCard(chapters = 0) {
  return {
    id: WITCHCULT_NOVEL_ID,
    title: "Re:Zero Web Novel",
    slug: "re-zero-web-novel",
    image: REZERO_COVER,
    cover: REZERO_BANNER,
    type: "WEBNOVEL",
    rating: 90,
    episodeNumber: chapters,
    subEpisodes: chapters,
    format: "WEBNOVEL",
    status: "RELEASING",
    year: 2012,
    countryOfOrigin: "JP",
    chapters
  };
}

export function isWitchCultNovelId(id: string) {
  return id === WITCHCULT_NOVEL_ID;
}

export function isWitchCultSearch(query: string) {
  const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return (
    !normalized ||
    normalized.includes("re zero") ||
    normalized.includes("rezero")
  );
}

function normalizeChapterUrl(href: string) {
  try {
    const url = new URL(href, WITCHCULT_BASE_URL);
    if (!ALLOWED_CHAPTER_HOSTS.has(url.hostname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function isChapterPageUrl(href: string) {
  return /arc-\d+-(?:chapter|interlude|appendix|final-chapter|special-part)/i.test(href);
}

function getChapterArcFromUrl(href: string) {
  const match = href.match(/arc-(\d+)-(?:chapter|interlude|appendix|final-chapter|special-part)/i);
  return match ? parseInt(match[1], 10) : null;
}

function isWitchCultChapterTitle(text: string) {
  return /(chapter|interlude|appendix|final chapter|special part|prologue)/i.test(text) && !/coming soon/i.test(text);
}

function romanToNumber(value: string) {
  const romanValues: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  return value
    .toUpperCase()
    .split("")
    .reduceRight(
      (acc, char) => {
        const current = romanValues[char] || 0;
        if (current < acc.previous) {
          return { total: acc.total - current, previous: acc.previous };
        }
        return { total: acc.total + current, previous: current };
      },
      { total: 0, previous: 0 }
    ).total;
}

function getArcNumberFromTitle(title: string) {
  if (/^Arc\s+\d+\s*,\s*Chapter/i.test(title)) return null;

  const match =
    title.match(/^Arc\s+([IVXLC]+|\d+)\s*[:–—-]/i) ||
    title.match(/^Arc\s+([IVXLC]+|\d+)\s*$/i);
  if (!match) return null;

  return /^\d+$/.test(match[1]) ? parseInt(match[1], 10) : romanToNumber(match[1]);
}

function getArcNumberFromUrl(href: string) {
  if (isChapterPageUrl(href)) return null;

  const match = href.match(/\/arc-(\d+)\/?(?:[?#]|$)/i);
  return match ? parseInt(match[1], 10) : null;
}

function cleanArcTitle(rawTitle: string, arcNumber: number) {
  return rawTitle.replace(/^Arc\s+[IVXLC\d]+\s*[:–—-]?\s*/i, "").trim() || `Arc ${arcNumber}`;
}

function arcIndexUrlScore(url: string) {
  if (/\/arc-\d+\/?$/i.test(url)) return 3;
  if (url.includes("page_id=")) return 2;
  if (url.includes("table-of-content")) return 1;
  return 0;
}

async function fetchTocPage() {
  const res = await gotScraping({ url: WITCHCULT_TOC_URL, http2: false });
  return load(res.body);
}

function parseTocArcHeadings($: ReturnType<typeof load>) {
  const arcs: { arc: number; title: string }[] = [];

  $(".entry-content")
    .first()
    .children("h1")
    .each((_, el) => {
      const rawTitle = $(el).text().replace(/\s+/g, " ").trim();
      const arc = getArcNumberFromTitle(rawTitle);
      if (!arc || arc > 10) return;
      arcs.push({ arc, title: cleanArcTitle(rawTitle, arc) });
    });

  return arcs;
}

function parseTocChaptersForArc($: ReturnType<typeof load>, arcNumber: number) {
  const chapters: { text: string; url: string }[] = [];
  let inArc = false;

  $(".entry-content")
    .first()
    .children()
    .each((_, el) => {
      const tag = el.tagName?.toLowerCase();
      if (tag === "h1") {
        const rawTitle = $(el).text().replace(/\s+/g, " ").trim();
        const arc = getArcNumberFromTitle(rawTitle);
        if (inArc) {
          inArc = false;
          return;
        }
        if (arc === arcNumber) inArc = true;
        return;
      }

      if (!inArc) return;

      $(el)
        .find("a")
        .each((__, link) => {
          const text = $(link).text().replace(/\s+/g, " ").trim();
          if (!isWitchCultChapterTitle(text)) return;

          const url = normalizeChapterUrl($(link).attr("href") || "");
          if (!url) return;

          chapters.push({ text, url });
        });
    });

  return chapters;
}

async function fetchWitchCultArcIndex() {
  const [homeRes, $toc] = await Promise.all([
    gotScraping({ url: WITCHCULT_BASE_URL, http2: false }),
    fetchTocPage()
  ]);
  const $home = load(homeRes.body);
  const urlByArc = new Map<number, string>();
  const titleByArc = new Map<number, string>();

  const addArcUrl = (arc: number, href: string, rawTitle: string) => {
    if (isChapterPageUrl(href)) return;

    const url = normalizeChapterUrl(href);
    if (!url || !url.includes("witchculttranslation.com")) return;

    const title = cleanArcTitle(rawTitle, arc) || EARLY_ARC_PAGES[arc]?.title || `Arc ${arc}`;
    const existing = urlByArc.get(arc);
    if (!existing || arcIndexUrlScore(url) > arcIndexUrlScore(existing)) {
      urlByArc.set(arc, url);
      titleByArc.set(arc, title);
    }
  };

  for (const linkEl of $home("a").toArray()) {
    const title = $home(linkEl).text().replace(/\s+/g, " ").trim();
    const href = $home(linkEl).attr("href") || "";

    if (/^Arcs\s+I/i.test(title) && href.includes("table-of-content")) {
      for (const arc of [1, 2, 3]) {
        urlByArc.set(arc, WITCHCULT_TOC_URL);
        titleByArc.set(arc, EARLY_ARC_PAGES[arc]?.title || `Arc ${arc}`);
      }
      continue;
    }

    const arcFromTitle = title ? getArcNumberFromTitle(title) : null;
    const arcFromUrl = getArcNumberFromUrl(href);
    const arc = arcFromTitle ?? arcFromUrl;
    if (!arc) continue;

    addArcUrl(arc, href, title || EARLY_ARC_PAGES[arc]?.title || `Arc ${arc}`);
  }

  for (const [arc, info] of Object.entries(EARLY_ARC_PAGES)) {
    const arcNum = parseInt(arc, 10);
    if (!urlByArc.has(arcNum)) {
      urlByArc.set(arcNum, info.url);
      titleByArc.set(arcNum, info.title);
    }
  }

  const tocArcs = parseTocArcHeadings($toc);
  if (tocArcs.length === 0) {
    return [...urlByArc.entries()]
      .map(([arc, url]) => ({
        arc,
        url,
        title: titleByArc.get(arc) || `Arc ${arc}`,
        useTocChapters: arc <= 3
      }))
      .sort((a, b) => a.arc - b.arc);
  }

  return tocArcs.map(({ arc, title }) => ({
    arc,
    url: urlByArc.get(arc) || WITCHCULT_TOC_URL,
    title: title || titleByArc.get(arc) || `Arc ${arc}`,
    useTocChapters: arc <= 3 || urlByArc.get(arc) === WITCHCULT_TOC_URL
  }));
}

function buildArcChapter(
  arcInfo: { arc: number; title: string },
  text: string,
  chapterUrl: string,
  seen: Set<string>,
  counters: { globalIndex: number; chapterInArc: number }
): ReaderArcChapter | null {
  const chapterSourceId = encodeURIComponent(`${chapterUrl}#${slugify(`arc-${arcInfo.arc}-${text}`)}`);
  const id = `witchcult:${chapterSourceId}`;
  if (seen.has(id)) return null;

  seen.add(id);
  counters.globalIndex += 1;
  counters.chapterInArc += 1;

  return {
    id,
    title: text,
    number: counters.globalIndex.toString(),
    arc: arcInfo.arc,
    arcTitle: arcInfo.title,
    chapterInArc: counters.chapterInArc,
    releaseDate: ""
  };
}

async function fetchWitchCultArcs(): Promise<{ arcs: ReaderArc[]; chapters: ReaderArcChapter[] }> {
  const arcIndex = await fetchWitchCultArcIndex();
  const needsToc = arcIndex.some((arc) => arc.useTocChapters);
  const $toc = needsToc ? await fetchTocPage() : null;
  const seen = new Set<string>();
  const counters = { globalIndex: 0, chapterInArc: 0 };

  const arcs: ReaderArc[] = [];

  for (const arcInfo of arcIndex) {
    try {
      const arcChapters: ReaderArcChapter[] = [];
      counters.chapterInArc = 0;
      let chapterLinks: { text: string; url: string }[] = [];

      if (arcInfo.useTocChapters && $toc) {
        chapterLinks = parseTocChaptersForArc($toc, arcInfo.arc);
      } else {
        const res = await gotScraping({ url: arcInfo.url, http2: false });
        const $ = load(res.body);

        for (const linkEl of $("a").toArray()) {
          const text = $(linkEl).text().replace(/\s+/g, " ").trim();
          if (/WCT Translations Progress Monitor/i.test(text)) break;
          if (!isWitchCultChapterTitle(text)) continue;

          const href = $(linkEl).attr("href") || "";
          const chapterArc = getChapterArcFromUrl(href);
          if (chapterArc !== null && chapterArc !== arcInfo.arc) continue;

          const chapterUrl = normalizeChapterUrl(href);
          if (!chapterUrl) continue;

          chapterLinks.push({ text, url: chapterUrl });
        }
      }

      for (const { text, url } of chapterLinks) {
        const chapter = buildArcChapter(arcInfo, text, url, seen, counters);
        if (chapter) arcChapters.push(chapter);
      }

      if (arcChapters.length > 0) {
        arcs.push({
          number: arcInfo.arc,
          title: arcInfo.title,
          url: arcInfo.url,
          chapters: arcChapters
        });
      }
    } catch (err) {
      console.error(`[ReZero] Failed to fetch arc ${arcInfo.arc}:`, err);
    }
  }

  const chapters = arcs.flatMap((arc) => arc.chapters);
  return { arcs, chapters };
}

async function fetchWitchCultChapterText(chapterUrlWithHash: string) {
  const chapterUrl = chapterUrlWithHash.split("#")[0];
  const res = await gotScraping({ url: chapterUrl, http2: false });
  const $ = load(res.body);
  const hostname = new URL(chapterUrl).hostname;

  const contentEl =
    hostname === "eminenttranslations.com"
      ? $(".reader-paged-content").first()
      : $("article").first().length
        ? $("article").first()
        : $("main").first();

  contentEl
    .find(
      [
        "script",
        "style",
        "iframe",
        "noscript",
        "form",
        "nav",
        "header",
        "footer",
        ".entry-meta",
        ".posted-on",
        ".byline",
        ".post-navigation",
        ".comments-area",
        ".sharedaddy",
        ".jp-relatedposts",
        ".wpcnt"
      ].join(", ")
    )
    .remove();

  contentEl.find("h1").first().remove();

  contentEl.find("p, li").each((_, el) => {
    const text = $(el).text().trim();
    if (
      /^[※\s\u3000\u203B*–\-]+$/u.test(text) ||
      /translated\s+by/i.test(text) ||
      /translation\s+of\s+the\s+free\s+japanese/i.test(text) ||
      /all\s+rights\s+belong\s+to\s+tappei/i.test(text) ||
      /japanese\s+web\s+novel\s+source/i.test(text) ||
      /support\s+.*on\s+twitter/i.test(text) ||
      /snusertranslations/i.test(text) ||
      /snusertl/i.test(text)
    ) {
      $(el).remove();
    }
  });

  return contentEl.html() || contentEl.text() || "Content load failed.";
}

export async function getWitchCultReaderDetails() {
  const { arcs, chapters } = await fetchWitchCultArcs();

  return {
    ...getWitchCultNovelCard(chapters.length),
    description:
      "Re:Zero − Starting Life in Another World began as a free web novel by Tappei Nagatsuki. Follow Subaru Natsuki through each story arc — from the capital to the sanctuary and beyond — in this complete English web novel reading experience.",
    releaseDate: "2012",
    genres: ["Action", "Adventure", "Drama", "Fantasy", "Isekai", "Psychological"],
    rating: 90,
    chapters,
    arcs,
    type: "WEBNOVEL",
    format: "WEBNOVEL"
  };
}

export async function getWitchCultChapterPages(chapterUrlWithHash: string) {
  const htmlText = await fetchWitchCultChapterText(chapterUrlWithHash);

  return [{
    page: 1,
    text: htmlText
  }];
}
