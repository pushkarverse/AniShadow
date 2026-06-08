/** Client-safe Re:Zero constants (no server/scraper imports). */

export const WITCHCULT_NOVEL_ID = "witchcult-re-zero-web-novel";

/** Official Re:Zero promotional art via webnovel.com */
export const REZERO_COVER =
  "https://book-pic.webnovel.com/bookcover/27200483305740105?imageMogr2/thumbnail/600x&imageId=1692046605695";
export const REZERO_BANNER =
  "https://witchculttranslation.com/wp-content/uploads/2024/09/Banner_new.jpg?x20762";

export function isReZeroNovelId(id: string) {
  return id === WITCHCULT_NOVEL_ID;
}

function slugToTitle(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getWitchCultPayload(chapterId: string) {
  if (!chapterId.startsWith("witchcult:")) return null;
  const payload = chapterId.slice("witchcult:".length);
  try {
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
}

export function isUrlLikeChapterTitle(title: string) {
  return (
    /^https?:\/\//i.test(title) ||
    /^\/\//.test(title) ||
    title.includes("witchculttranslation.com")
  );
}

/** Parse readable title from witchcult chapter id URL/hash (e.g. arc-6-chapter-26-stick-swinger). */
export function parseWitchCultChapterTitleFromId(chapterId: string): string | null {
  const payload = getWitchCultPayload(chapterId);
  if (!payload) return null;

  const match = payload.match(/arc-(\d+)-chapter-(\d+)-([^/#?]+)/i);
  if (!match) return null;

  const [, , chapterNum, titleSlug] = match;
  const title = slugToTitle(titleSlug);
  return title ? `Chapter ${chapterNum} – ${title}` : `Chapter ${chapterNum}`;
}

export function readerChapterIdsMatch(a: string, b: string) {
  if (a === b) return true;

  const payloadA = getWitchCultPayload(a);
  const payloadB = getWitchCultPayload(b);
  if (payloadA && payloadB) return payloadA === payloadB;

  return false;
}

export function encodeReaderChapterPathId(chapterId: string) {
  return encodeURIComponent(chapterId);
}

export function decodeReaderChapterPathId(segments: string[]) {
  const raw = segments.length === 1 ? segments[0] : segments.join("/");
  return decodeURIComponent(raw);
}

export function findReaderChapter<T extends { id: string }>(
  chapters: T[],
  chapterId: string
): T | undefined {
  return chapters.find((chapter) => readerChapterIdsMatch(chapter.id, chapterId));
}

export function getChapterDisplayTitle(
  chapterId: string,
  chapter?: { title?: string; number?: string; chapterInArc?: number } | null,
  fallbackNumber?: string
) {
  const title = chapter?.title;
  if (title && !isUrlLikeChapterTitle(title)) return title;

  const parsed = parseWitchCultChapterTitleFromId(chapterId);
  if (parsed) return parsed;

  const num = chapter?.chapterInArc || chapter?.number || fallbackNumber;
  return num ? `Chapter ${num}` : "Chapter";
}

export function getChapterShortTitle(
  chapterId: string,
  chapter?: { title?: string; number?: string; chapterInArc?: number } | null,
  fallbackNumber?: string
) {
  const full = getChapterDisplayTitle(chapterId, chapter, fallbackNumber);
  const stripped = full.replace(/^Chapter\s+[\d.]+[:\s–—-]?\s*/i, "").trim();
  return stripped || full;
}

export function getReaderChapterPath(mangaId: string, slug: string, chapterId: string) {
  return `/reader/read/${mangaId}/${slug}/${encodeReaderChapterPathId(chapterId)}`;
}
