
import { useEffect } from "react";

interface HistoryTrackerProps {
  animeId: string;
  title: string;
  image: string;
  episodeNumber: number;
  displayEpisodeNumber: number;
  episodeTitle?: string;
  slug?: string;
}

export function HistoryTracker({ animeId, title, image, episodeNumber, displayEpisodeNumber, episodeTitle, slug }: HistoryTrackerProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem("anishadow-history");
    const history = saved ? JSON.parse(saved) : [];
    const newEntry = {
      animeId,
      title,
      image,
      episodeNumber,
      displayEpisodeNumber,
      episodeTitle,
      slug,
      watchedAt: new Date().toISOString(),
    };

    // Remove old entry if exists and prepend new one
    const filtered = history.filter((item: { animeId: string }) => item.animeId !== animeId);
    const updated = [newEntry, ...filtered].slice(0, 50); // Keep last 50
    localStorage.setItem("anishadow-history", JSON.stringify(updated));
  }, [animeId, title, image, episodeNumber, displayEpisodeNumber, episodeTitle, slug]);

  return null;
}
