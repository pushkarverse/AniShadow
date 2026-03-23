/**
 * Helper to extract string title from various formats
 */
export function getAnimeTitle(title: string | { english?: string; romaji?: string; native?: string } | undefined): string {
    if (!title) return "Unknown Anime";
    if (typeof title === 'string') return title;
    return title.english || title.romaji || title.native || "Unknown Anime";
}
/**
 * Maps country code to manga format
 */
export function getMangaFormat(country?: string): string {
    if (country === 'KR') return 'Manhwa';
    if (country === 'CN') return 'Manhua';
    return 'Manga';
}
