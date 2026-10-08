
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, ChevronDown, Check, BookmarkPlus, BookmarkCheck, Share2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ReaderActionsProps {
  mangaId: string;
  title: string;
  slug: string;
  image: string;
}

const statusOptions = ["Reading", "On-Hold", "Planning", "Completed", "Dropped"];

export function ReaderActions({ mangaId, title, slug, image }: ReaderActionsProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const savedStatus = localStorage.getItem(`mangashadow-status-${mangaId}`);
    if (savedStatus) setCurrentStatus(savedStatus);
    
    const savedWatchlist = localStorage.getItem("mangashadow-watchlist");
    if (savedWatchlist) {
      const watchlist = JSON.parse(savedWatchlist);
      const exists = watchlist.some((item: { mangaId: string }) => item.mangaId === mangaId);
      setIsAdded(exists);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mangaId]);

  const handleStatusChange = (status: string) => {
    setCurrentStatus(status);
    localStorage.setItem(`mangashadow-status-${mangaId}`, status);
    setShowStatusMenu(false);
  };

  const toggleWatchlist = () => {
    setIsLoading(true);
    const saved = localStorage.getItem("mangashadow-watchlist");
    const watchlist = saved ? JSON.parse(saved) : [];
    
    if (isAdded) {
      const updated = watchlist.filter((item: { mangaId: string }) => item.mangaId !== mangaId);
      localStorage.setItem("mangashadow-watchlist", JSON.stringify(updated));
      setIsAdded(false);
    } else {
      const newItem = { 
        mangaId, 
        title, 
        slug,
        image, 
        addedAt: new Date().toISOString() 
      };
      const updated = [...watchlist, newItem];
      localStorage.setItem("mangashadow-watchlist", JSON.stringify(updated));
      setIsAdded(true);
    }
    setIsLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button 
        onClick={toggleWatchlist}
        disabled={isLoading}
        className={`flex items-center gap-3 px-6 py-4 rounded-xl border transition-all font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95
          ${isAdded 
              ? "bg-white/5 border-white/10 text-white/40" 
              : "bg-primary hover:bg-primary/90 text-white border-accent/40 shadow-primary/10"
          }
        `}
      >
        {isAdded ? (
          <>
            <BookmarkCheck className="w-4 h-4 text-primary" />
            <span>In Library</span>
          </>
        ) : (
          <>
            <BookmarkPlus className="w-4 h-4" />
            <span>Add to Library</span>
          </>
        )}
      </button>

      <button className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-white/40 hover:text-white group flex items-center justify-center">
        <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </button>

      <div className="relative" ref={statusMenuRef}>
        <button 
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className={`flex items-center gap-3 px-5 py-4 rounded-xl border transition-all font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95
            ${currentStatus 
              ? "bg-white/10 text-white border-white/20" 
              : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
            }
          `}
        >
          <FolderOpen className="w-4 h-4" />
          <span>{currentStatus || "Status"}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showStatusMenu && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: -10 }} 
              className="absolute left-0 bottom-full mb-4 w-52 bg-[#0a0d14] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 p-1.5 ring-1 ring-white/5"
            >
              {statusOptions.map((status) => (
                <button 
                  key={status} 
                  onClick={() => handleStatusChange(status)} 
                  className="w-full px-4 py-2.5 text-left text-[10px] font-bold rounded-xl hover:bg-white/5 transition-all flex items-center justify-between group/opt"
                >
                  <span className={currentStatus === status ? 'text-primary' : 'text-white/40 group-hover/opt:text-white'}>{status}</span>
                  {currentStatus === status && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
