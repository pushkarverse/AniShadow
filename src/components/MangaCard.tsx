"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Info, Star, FolderOpen, ChevronDown, Check, X, BookOpen, BookmarkPlus, BookmarkCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

import { IAnimeInfo } from "@consumet/extensions";
import { RoomModal } from "./RoomModal";

import { getMangaDetails } from "@/lib/consumet";
import { getMangaFormat, slugify } from "@/lib/anime-utils";

interface MangaCardProps {
  id: string;
  title: string;
  slug?: string;
  image: string;
  rating?: number;
  type?: string;
  chapters?: number;
  chapterNumber?: number;
  status?: string;
  countryOfOrigin?: string;
  href?: string;
  variant?: "default" | "search";
}

const statusOptions = ["Reading", "On-Hold", "Planning", "Completed", "Dropped"];

function getDisplayTitle(title: string | { english?: string; romaji?: string; userPreferred?: string; native?: string } | undefined): string {
  if (!title) return "Unknown";
  if (typeof title === 'string') return title;
  return title.english || title.romaji || title.userPreferred || title.native || "Unknown";
}

export const MangaCard = ({
  id,
  title,
  slug,
  image,
  rating,
  type = "MANGA",
  chapters,
  chapterNumber,
  status,
  countryOfOrigin,
  href,
  variant = "default"
}: MangaCardProps) => {
  const format = getMangaFormat(countryOfOrigin);
  const [showInfo, setShowInfo] = useState(false);
  const [infoData, setInfoData] = useState<IAnimeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, flipX: false, flipY: false });
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [statusMenuPos, setStatusMenuPos] = useState({ top: 0, left: 0 });
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedStatus = localStorage.getItem(`mangashadow-status-${id}`);
    if (savedStatus) setCurrentStatus(savedStatus);

    const savedWatchlist = localStorage.getItem("mangashadow-watchlist");
    if (savedWatchlist) {
      const watchlist = JSON.parse(savedWatchlist);
      const exists = watchlist.some((item: { mangaId: string }) => item.mangaId === id);
      setIsInLibrary(exists);
    }

    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [id]);

  useEffect(() => {
    if (currentStatus) {
      localStorage.setItem(`mangashadow-status-${id}`, currentStatus);
    }
  }, [currentStatus, id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        if (!statusButtonRef.current || !statusButtonRef.current.contains(event.target as Node)) {
          setShowStatusMenu(false);
        }
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
      const res = await fetch(`/api/anime/${id}/info`); // Reuse anime info API for now as it handles both
      const data = await res.json();
      setInfoData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const mangaSlug = slug || slugify(title);
  const detailsUrl = href || `/manga/${id}/${mangaSlug}`;
  const actionUrl = href || `/manga/${id}/${mangaSlug}`;

  const toggleLibrary = () => {
    setIsLibraryLoading(true);
    const saved = localStorage.getItem("mangashadow-watchlist");
    const watchlist = saved ? JSON.parse(saved) : [];

    if (isInLibrary) {
      const updated = watchlist.filter((item: { mangaId: string }) => item.mangaId !== id);
      localStorage.setItem("mangashadow-watchlist", JSON.stringify(updated));
      setIsInLibrary(false);
    } else {
      const newItem = {
        mangaId: id,
        title,
        slug: mangaSlug,
        image,
        addedAt: new Date().toISOString()
      };
      const updated = [...watchlist, newItem];
      localStorage.setItem("mangashadow-watchlist", JSON.stringify(updated));
      setIsInLibrary(true);
    }
    setIsLibraryLoading(false);
  };

  return (
    <div className={variant === "search" ? "group relative flex flex-col gap-2 w-full manga-theme" : "group relative flex flex-col gap-3 manga-theme w-[155px] sm:w-[180px] shrink-0 md:w-full"}>
      {/* Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#121212] border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-primary/50 group-hover:shadow-primary/20 group-hover:-translate-y-1">
        <Link href={actionUrl} className="block w-full h-full relative">
          <Image
            src={image || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=500&auto=format&fit=crop"}
            alt={title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
            className="object-cover transition-all duration-700 group-hover:scale-105"
            unoptimized
          />
          
          {/* Enhanced Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </Link>

        {/* Status Badges Overlay */}
        {variant === "search" ? (
          <div className="absolute top-2 left-2 flex items-center gap-1 select-none pointer-events-none">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black text-yellow-400">
              <span>★</span>
              <span className="text-white font-bold">{rating ? Number(rating).toFixed(1) : "8.5"}</span>
            </div>
            <div className="px-1.5 py-0.5 rounded bg-[#ff6600]/25 backdrop-blur-md border border-[#ff6600]/30 text-[9px] font-black text-orange-400 uppercase">
              {format || "MANGA"}
            </div>
          </div>
        ) : (
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10 pointer-events-none">
            <div className="flex items-center gap-1">
              {rating && (
                <span className="px-1.5 py-0.5 text-[9px] font-black tracking-widest rounded bg-black/60 text-primary backdrop-blur-md border border-white/10 uppercase">
                  {Number(rating).toFixed(1)}
                </span>
              )}
              <span className="px-1.5 py-0.5 text-[9px] font-black tracking-widest rounded bg-primary text-white backdrop-blur-md border border-white/10 uppercase">
                {format}
              </span>
            </div>
          </div>
        )}

        {/* Info Button (Top Right) */}
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
                  const popoverHeight = 600; 

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

        {/* Bottom Chapters overlay for Search Variant */}
        {variant === "search" && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center z-10 pointer-events-none select-none">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/5 text-[9px] font-bold text-white/90">
              <span className="flex items-center gap-0.5 text-white/60">
                <span>CH</span>
                <span>{chapters || chapterNumber || "?"}</span>
              </span>
            </div>
          </div>
        )}

        {/* Quick Info Popover */}
        {isMounted && createPortal(
          <AnimatePresence>
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
                  className={`z-[9999] bg-[#0a0a0a]/95 backdrop-blur-xl border-white/10 p-0 shadow-[-20px_0_50px_rgba(0,0,0,0.5),var(--shadow-primary)] flex flex-col overflow-hidden ring-1 ring-white/5 manga-theme ${
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
                         Manga Preview
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
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-0.5">Chapters</span>
                            <div className="flex items-center gap-1.5 text-white/80">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span className="text-sm font-black tracking-tighter">{(infoData as any).chapters || "N/A"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative" ref={statusMenuRef}>
                            <button
                              type="button"
                              ref={statusButtonRef}
                              onClick={() => {
                                const nextOpen = !showStatusMenu;
                                if (nextOpen && statusButtonRef.current) {
                                  const rect = statusButtonRef.current.getBoundingClientRect();
                                  const windowWidth = window.innerWidth;
                                  const windowHeight = window.innerHeight;
                                  const menuWidth = 176;
                                  const menuHeight = 220;

                                  let left = rect.left;
                                  let top = rect.bottom + 8;

                                  if (left + menuWidth > windowWidth - 10) {
                                    left = windowWidth - menuWidth - 10;
                                  }

                                  if (top + menuHeight > windowHeight - 10) {
                                    top = rect.top - menuHeight - 8;
                                  }

                                  setStatusMenuPos({ top, left });
                                }
                                setShowStatusMenu(nextOpen);
                              }}
                              className={`px-3 py-2 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${currentStatus ? 'bg-primary text-white border-primary/40' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                            >
                              <FolderOpen className="w-4 h-4" />
                              <span>{currentStatus || "Status"}</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
                            </button>
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
                          <span className="text-[11px] font-bold text-white/80 capitalize">{format}</span>
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
                  <div className="flex items-center gap-3">
                    <Link href={detailsUrl} className="flex-1 flex items-center justify-center py-3 bg-primary text-white hover:bg-primary/90 rounded-xl text-sm font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                    Start Reading
                    </Link>
                    <button
                      type="button"
                      onClick={toggleLibrary}
                      disabled={isLibraryLoading}
                      className={`px-3 py-3 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${isInLibrary ? 'bg-white/5 border-white/10 text-white/50' : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
                    >
                      {isInLibrary ? (
                        <>
                          <BookmarkCheck className="w-4 h-4 text-primary" />
                          <span>Library</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-4 h-4" />
                          <span>Library</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
          </AnimatePresence>,
          document.body
        )}
        {isMounted && createPortal(
          <AnimatePresence>
            {showStatusMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                style={{
                  position: "fixed",
                  top: statusMenuPos.top,
                  left: statusMenuPos.left,
                  width: "176px"
                }}
                className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-[10000] p-1.5"
              >
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => { setCurrentStatus(status); setShowStatusMenu(false); }}
                    className="w-full px-3 py-2 text-left text-[11px] font-bold rounded-lg hover:bg-white/5 transition-all flex items-center justify-between group/opt"
                  >
                    <span className={currentStatus === status ? 'text-primary' : 'text-white/50 group-hover/opt:text-white'}>{status}</span>
                    {currentStatus === status && <Check className="w-3 h-3 text-primary" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>

      

      <RoomModal 
        isOpen={isRoomModalOpen} 
        onClose={() => setIsRoomModalOpen(false)} 
        animeId={id}
        animeTitle={title} 
        slug={mangaSlug}
      />
    </div>
  );
}
