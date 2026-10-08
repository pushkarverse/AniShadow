
import { useState, useEffect } from "react";
import { BookmarkPlus, BookmarkCheck } from "lucide-react";

interface WatchlistButtonProps {
  animeId: string;
  title: string;
  image: string;
}

export function WatchlistButton({ animeId, title, image }: WatchlistButtonProps) {
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check watchlist on mount
    const saved = typeof window !== 'undefined' ? localStorage.getItem("anishadow-watchlist") : null;
    if (saved) {
      const watchlist = JSON.parse(saved);
      const exists = watchlist.some((item: { animeId: string }) => item.animeId === animeId);
      setIsAdded(exists);
    }
    setMounted(true);
  }, [animeId]);

  if (!mounted) return <div className="p-4 rounded-lg bg-primary/20 border border-primary/50 w-14 h-14 animate-pulse" />;

  const toggleWatchlist = () => {
    setIsLoading(true);
    const saved = localStorage.getItem("anishadow-watchlist");
    const watchlist = saved ? JSON.parse(saved) : [];
    
    if (isAdded) {
      const updated = watchlist.filter((item: { animeId: string }) => item.animeId !== animeId);
      localStorage.setItem("anishadow-watchlist", JSON.stringify(updated));
      setIsAdded(false);
    } else {
      const newItem = { 
        animeId, 
        title, 
        image, 
        addedAt: new Date().toISOString() 
      };
      const updated = [...watchlist, newItem];
      localStorage.setItem("anishadow-watchlist", JSON.stringify(updated));
      setIsAdded(true);
    }
    setIsLoading(false);
  };

  return (
    <button 
      onClick={toggleWatchlist}
      disabled={isLoading}
      className={`p-4 rounded-lg border transition-colors backdrop-blur-sm group flex items-center justify-center
        ${isAdded 
            ? "bg-primary/20 border-primary/50" 
            : "bg-primary hover:bg-primary/90 text-white border-accent/40 shadow-lg"
        }
        ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
      `}
      title={isAdded ? "Remove from Watchlist" : "Add to Watchlist"}
    >
        {isAdded ? (
            <BookmarkCheck className="w-6 h-6 text-primary transition-colors" />
        ) : (
            <BookmarkPlus className="w-6 h-6 text-white transition-colors" />
        )}
    </button>
  );
}
