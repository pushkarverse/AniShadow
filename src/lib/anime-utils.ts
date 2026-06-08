/**
 * Helper to extract string title from various formats
 */
export function getAnimeTitle(title: string | { english?: string; romaji?: string; native?: string } | undefined): string {
    if (!title) return "Unknown Anime";
    if (typeof title === 'string') return title;
    return title.english || title.romaji || title.native || "Unknown Anime";
}
/**
 * Maps country code and format type to manga/novel format
 */
export function getMangaFormat(country?: string, formatOrType?: string, id?: string): string {
    if (formatOrType === 'WEBNOVEL' || formatOrType === 'WEB_NOVEL' || formatOrType?.toLowerCase() === 'webnovel') return 'Web Novel';
    if (formatOrType === 'NOVEL' || formatOrType?.toLowerCase() === 'novel') return 'Light Novel';
    if (country === 'KR') return 'Manhwa';
    if (country === 'CN') return 'Manhua';
    return 'Manga';
}

/**
 * Generates a URL-friendly slug from a string
 */
export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w-]+/g, '')  // Remove all non-word chars
        .replace(/--+/g, '-')     // Replace multiple - with single -
        .replace(/^-+/, '')       // Trim - from start of text
        .replace(/-+$/, '');      // Trim - from end of text
}
