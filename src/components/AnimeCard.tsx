
import { motion, AnimatePresence } from "framer-motion";
import { Info, Star, ThumbsUp, Users, FolderOpen, ChevronDown, Check, X } from "lucide-react";
import Image from "@/compat/Image";
import Link from "@/compat/Link";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

import { IAnimeInfo } from "@consumet/extensions";
import { RoomModal } from "./RoomModal";
import { slugify } from "@/lib/anime-utils";

interface AnimeCardProps {
  id: string;
  title: string;
  slug?: string;
  image: string;
  episodeNumber?: number;
  rating?: number;
  type?: string;
  href?: string;
  subEpisodes?: number | string;
  dubEpisodes?: number | string;
  variant?: "default" | "search";
  duration?: string;
  priority?: boolean;
}

const statusOptions = ["Watching", "On-Hold", "Planning", "Completed", "Dropped"];

function getDisplayTitle(title: string | { english?: string; romaji?: string; userPreferred?: string; native?: string } | undefined): string {
  if (!title) return "Unknown";
  if (typeof title === 'string') return title;
  return title.english || title.romaji || title.userPreferred || title.native || "Unknown";
}

export function AnimeCard({ 
  id, 
  title, 
  slug,
  image, 
  rating,
  type, 
  href,
  variant = "default",
  priority = false
}: AnimeCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [infoData, setInfoData] = useState<IAnimeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, flipX: false, flipY: false });
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedStatus = localStorage.getItem(`anime-status-${id}`);
    if (savedStatus) setCurrentStatus(savedStatus);

    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [id]);

  useEffect(() => {
    if (currentStatus) {
      localStorage.setItem(`anime-status-${id}`, currentStatus);
    }
  }, [currentStatus, id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && 
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setShowInfo(false);
      }
    };

    if (showInfo || showStatusMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInfo, showStatusMenu]);

  const fetchInfo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/anime/${id}/info`);
      const data = await res.json();
      setInfoData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const isManga = type === 'MANGA' || (infoData?.type === 'MANGA');
  const animeSlug = slug || slugify(title);
  const detailsUrl = href || `/anime/${id}/${animeSlug}`;
  const actionUrl = href || (isManga ? `/anime/${id}/${animeSlug}` : `/anime/watch/${id}/${animeSlug}?ep=1`);

  const displayTitle = getDisplayTitle(title);

  return (
    <div className={variant === "search" ? "group relative flex flex-col gap-2 w-full" : "group relative flex flex-col gap-3 w-[155px] sm:w-[180px] shrink-0 md:w-full"}>
      {/* Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#121212] border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-primary/50 group-hover:shadow-primary/20 group-hover:-translate-y-1">
        <Link href={actionUrl} className="block w-full h-full relative">
          <Image
            src={image || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=500&auto=format&fit=crop"}
            alt={title}
            fill
            priority={priority}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
            className="object-cover transition-all duration-700 group-hover:scale-105"
            unoptimized
          />
          
          {/* Enhanced Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </Link>

          {/* Rating Badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1 select-none pointer-events-none z-10">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black text-yellow-400">
              <span>★</span>
              <span className="text-white font-bold">
                {rating ? (Number(rating) > 10 ? (Number(rating) / 10).toFixed(1) : Number(rating).toFixed(1)) : "0.0"}
              </span>
            </div>
          </div>

        {/* Info/Watchlist '+' Button (Top Right) */}
        <div className="absolute top-2 right-2 z-20">
          <button 
            ref={triggerRef}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              if (!showInfo) {
                if (isMobileViewport) {
                  fetchInfo();
                  setShowInfo(true);
                  return;
                }
                const rect = triggerRef.current?.getBoundingClientRect();
                if (rect) {
                  const windowWidth = window.innerWidth;
                  const windowHeight = window.innerHeight;
                  const popoverWidth = 320; 
                  const popoverHeight = 600; // Final safe estimate to prevent any bottom clipping

                  let left = rect.right + 10;
                  let top = rect.top;
                  let flipX = false;
                  
                  if (left + popoverWidth > windowWidth) {
                    left = rect.left - popoverWidth - 10;
                    flipX = true;
                  }

                  if (top + popoverHeight > windowHeight) {
                    top = Math.max(10, windowHeight - popoverHeight - 40);
                  }

                  setPopoverPos({ top, left, flipX, flipY: false });
                  fetchInfo();
                }
                setShowInfo(true);
              } else {
                setShowInfo(false);
              }
            }}
            className={variant === "search"
              ? "w-7 h-7 flex items-center justify-center rounded-full bg-black/60 hover:bg-primary text-white border border-white/15 transition-all shadow-lg active:scale-90 cursor-pointer"
              : "p-2 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg border border-accent/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 scale-90 hover:scale-100"
            }
          >
            {variant === "search" ? (
              <span className="text-lg font-light leading-none">+</span>
            ) : (
              <Info className="w-4 h-4" />
            )}
          </button>
        </div>

      </div>

      <Link href={detailsUrl} className="block mt-2 px-1">
        <h3 className="text-[11px] font-black text-white/85 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {displayTitle}
        </h3>
      </Link>

        {/* Quick Info Popover */}
        {isMounted && createPortal(
          <AnimatePresence key={`anime-info-presence-${id}`}>
            {showInfo && (
              <>
                {/* Backdrop Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowInfo(false)}
                  className="fixed inset-0 bg-black/60 z-[9998] backdrop-blur-xs"
                />
                <motion.div
                  ref={popoverRef}
                  initial={
                    isMobileViewport
                      ? { y: "100%", opacity: 1, scale: 1, x: 0 }
                      : { x: "100%", opacity: 1, scale: 1, y: 0 }
                  }
                  animate={{ x: 0, y: 0 }}
                  exit={
                    isMobileViewport
                      ? { y: "100%" }
                      : { x: "100%" }
                  }
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  style={
                    isMobileViewport
                      ? { 
                          position: 'fixed',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          width: '100%',
                        }
                      : { 
                          position: 'fixed',
                          top: 0,
                          bottom: 0,
                          right: 0,
                          width: '400px',
                          height: '100vh',
                        }
                  }
                  onClick={(e) => e.stopPropagation()}
                  className={`z-[9999] bg-card/95 backdrop-blur-xl border-white/10 p-0 shadow-[-20px_0_50px_rgba(0,0,0,0.5),var(--shadow-primary)] flex flex-col overflow-hidden ring-1 ring-white/5 ${
                    isMobileViewport 
                      ? 'rounded-t-3xl max-h-[80vh] border-t' 
                      : 'border-l h-screen'
                  }`}
                >
                  {/* Drag handle visible only on mobile bottom sheet */}
                  {isMobileViewport && (
                    <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 shrink-0" />
                  )}

                  {/* Header - Fixed */}
                  <div className={`flex justify-between items-start pb-4 shrink-0 bg-gradient-to-b from-white/[0.02] to-transparent ${
                    isMobileViewport ? 'px-6 pt-1' : 'p-6'
                  }`}>
                    <div className="flex flex-col gap-1">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                         <div className="w-1 h-3 bg-primary rounded-full" />
                         Quick Preview
                      </h4>
                    </div>
                    <button onClick={() => setShowInfo(false)} className="p-1 rounded-full hover:bg-white/5 text-white/30 hover:text-white transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar space-y-6">
                  {isLoading ? (
                    <div className="flex flex-col gap-4 animate-pulse">
                      <div className="h-6 bg-white/10 rounded w-3/4" />
                      <div className="h-4 bg-white/10 rounded w-1/2" />
                      <div className="h-32 bg-white/10 rounded-lg" />
                    </div>
                  ) : infoData ? (
                    <div className="space-y-6">
                      <div className="relative">
                        <div className="flex justify-between items-start gap-3">
                          <Link href={detailsUrl} className="hover:text-primary transition-colors">
                            <h4 className="text-xl font-black leading-tight tracking-tight">{getDisplayTitle(infoData.title)}</h4>
                          </Link>
                        </div>
                        <p className="text-[11px] font-bold text-white/40 line-clamp-1 mt-1 uppercase tracking-wider">
                          {typeof infoData.title === 'object' ? (infoData.title as { native?: string }).native || (infoData.title as { romaji?: string }).romaji : ''}
                        </p>
                      </div>

                      <div className="flex items-center justify-between py-1 px-1">
                        <div className="flex items-center gap-5">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-0.5">Rating</span>
                            <div className="flex items-center gap-1.5 text-accent">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span className="text-sm font-black tracking-tighter">{((infoData.rating || 70) / 10).toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="h-6 w-[1px] bg-white/10" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-0.5">Popularity</span>
                            <div className="flex items-center gap-1.5 text-white/80">
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span className="text-sm font-black tracking-tighter">{infoData.rating || "N/A"}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="group relative flex items-center">
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsRoomModalOpen(true); }} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-white/60 hover:text-white group/btn">
                              <Users className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] px-2 py-1 bg-amber-600 text-white text-[8px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl scale-90 group-hover:scale-100 origin-bottom">Watch Party</span>
                          </div>
                          <div className="relative" ref={statusMenuRef}>
                            <button onClick={() => setShowStatusMenu(!showStatusMenu)} className={`p-2.5 rounded-xl border transition-all flex items-center gap-1 ${currentStatus ? 'bg-primary text-white border-primary/40' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}>
                              <FolderOpen className="w-4 h-4" />
                              <ChevronDown className={`w-3 h-3 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {showStatusMenu && (
                                <motion.div initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -10 }} className="absolute left-0 bottom-full mb-3 w-44 bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-50 p-1.5">
                                  {statusOptions.map((status) => (
                                    <button key={status} onClick={() => { setCurrentStatus(status); setShowStatusMenu(false); }} className="w-full px-3 py-2 text-left text-[11px] font-bold rounded-lg hover:bg-white/5 transition-all flex items-center justify-between group/opt">
                                      <span className={currentStatus === status ? 'text-primary' : 'text-white/50 group-hover/opt:text-white'}>{status}</span>
                                      {currentStatus === status && <Check className="w-3 h-3 text-primary" />}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Synopsis</h5>
                        <div className="text-xs leading-[1.6] text-white/70 font-medium">
                          {infoData.description?.replace(/<[^>]*>?/gm, '') || "No description available."}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2 border-t border-white/5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Type</span>
                          <span className="text-[11px] font-bold text-white/80 capitalize">{infoData.type || "Unknown"}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Status</span>
                          <span className="text-[11px] font-bold text-white/80 capitalize">{infoData.status?.replace(/_/g, ' ').toLowerCase() || "Unknown"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <p className="text-white/30 text-xs italic">Failed to load details.</p>
                    </div>
                  )}
                </div>

                {/* Footer Link - Fixed */}
                <div className="p-6 pt-0 shrink-0">
                  <Link href={detailsUrl} className="flex items-center justify-center w-full py-3 bg-primary text-white hover:bg-primary/90 rounded-xl text-sm font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                    View full details
                  </Link>
                </div>
              </motion.div>
            </>
          )}
          </AnimatePresence>,
          document.body
        )}

      <RoomModal 
        isOpen={isRoomModalOpen} 
        onClose={() => setIsRoomModalOpen(false)} 
        animeId={id}
        animeTitle={title} 
        slug={animeSlug}
      />
    </div>
  );
}
