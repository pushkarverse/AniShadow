"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, FolderOpen, ChevronDown, Check, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { RoomModal } from "./RoomModal";

interface AnimeActionsProps {
  animeId: string;
  title: string;
  image: string;
}

const statusOptions = ["Watching", "On-Hold", "Planning", "Completed", "Dropped"];

export function AnimeActions({ animeId, title, image }: AnimeActionsProps) {
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Effect to set mounted state once on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Effect to load status and watchlist from localStorage
  useEffect(() => {
    const savedStatus = localStorage.getItem(`anime-status-${animeId}`);
    if (savedStatus) setCurrentStatus(savedStatus);
    
    const savedWatchlist = localStorage.getItem("anishadow-watchlist");
    if (savedWatchlist) {
      const watchlist = JSON.parse(savedWatchlist);
      const exists = watchlist.some((item: { animeId: string }) => item.animeId === animeId);
      setIsAdded(exists);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [animeId]);

  const handleStatusChange = (status: string) => {
    setCurrentStatus(status);
    localStorage.setItem(`anime-status-${animeId}`, status);
    setShowStatusMenu(false);
  };

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

  if (!mounted) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Watchlist Button */}
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
            <span>In List</span>
          </>
        ) : (
          <>
            <BookmarkPlus className="w-4 h-4" />
            <span>Watchlist</span>
          </>
        )}
      </button>

      {/* Community / Watch Party Button */}
      <div className="group relative">
        <button 
          onClick={() => setIsRoomModalOpen(true)}
          className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-white/40 hover:text-white group/btn flex items-center justify-center"
        >
          <Users className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+12px)] px-3 py-1.5 bg-[#0a0d14] border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-2xl scale-90 group-hover:scale-100 origin-bottom">
          Watch Party
        </div>
      </div>

      {/* Status / Folder Button */}
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

      <RoomModal 
        isOpen={isRoomModalOpen} 
        onClose={() => setIsRoomModalOpen(false)} 
        animeId={animeId}
        animeTitle={title} 
      />
    </div>
  );
}
