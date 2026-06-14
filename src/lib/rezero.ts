/** Client-safe Re:Zero constants (no server/scraper imports). */

export const WITCHCULT_NOVEL_ID = "witchcult-re-zero-web-novel";
export const REZERO_ENGLISH_TITLE = "Re:ZERO -Starting Life in Another World-";
export const REZERO_LIGHT_NOVEL_VOLUME_COUNT = 44;

export const REZERO_COVER = "/rezero-cover.jpg";
export const REZERO_BANNER =
  "https://witchculttranslation.com/wp-content/uploads/2024/09/Banner_new.jpg?x20762";

export const REZERO_IF_ROUTES = [
  { title: "Sloth IF (Rem IF)", url: "https://remonwater.wordpress.com/2017/06/04/reif-starting-life-in-a-different-world-prologue-the-beginning/" },
  { title: "Pride IF (Ayamatsu)", url: "https://witchculttranslation.com/wp-content/uploads/2019/02/ayamatsu-april-fools-2017.pdf?x20762" },
  { title: "Wrath IF (Oboreru)", url: "https://witchculttranslation.com/2018/08/23/rezero-if-oboreru/" },
  { title: "Greed IF (Kasaneru)", url: "https://witchculttranslation.com/2019/02/11/kasaneru-if-re-repeating-life-in-another-world-from-zero/" },
  { title: "Gluttony IF (Tsugihagu)", url: "https://witchculttranslation.com/2019/04/05/tsugihagu-if-re-patching-together-a-life-in-another-world-from-zero/" },
  { title: "Lust IF (Butterfly Dream)", url: "https://eminenttranslations.com/rezero/side-stories/lust-if-the-butterfly-dream/" },
  { title: "Sacrifice IF (Sasageru)", url: "https://docs.google.com/document/d/1lg8Mm6agnrWTujHJ_O5oayY5MV-Zyg16glAU-XeoMQs/preview" },
];

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
export function parseWitchCultChapterTitleFromId(
  chapterId: string,
): string | null {
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
  chapterId: string,
): T | undefined {
  return chapters.find((chapter) =>
    readerChapterIdsMatch(chapter.id, chapterId),
  );
}

export function getChapterDisplayTitle(
  chapterId: string,
  chapter?: { title?: string; number?: string; chapterInArc?: number } | null,
  fallbackNumber?: string,
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
  fallbackNumber?: string,
) {
  const full = getChapterDisplayTitle(chapterId, chapter, fallbackNumber);
  const stripped = full.replace(/^Chapter\s+[\d.]+[:\s–—-]?\s*/i, "").trim();
  return stripped || full;
}

export function getReaderChapterPath(
  mangaId: string,
  slug: string,
  chapterId: string,
) {
  return `/reader/read/${mangaId}/${slug}/${encodeReaderChapterPathId(chapterId)}`;
}
