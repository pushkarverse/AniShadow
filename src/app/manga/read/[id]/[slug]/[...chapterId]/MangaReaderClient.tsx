"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  Settings, 
  Maximize2, 
  X, 
  Info, 
  SlidersHorizontal,
  BookOpen, 
  Layout, 
  Eye, 
  Check, 
  Maximize, 
  Bookmark, 
  ChevronDown 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Chapter {
  id: string;
  number: string;
  title?: string;
}

interface MangaReaderClientProps {
  pages: { page: number; img: string }[];
  chapterId: string;
  mangaId?: string;
  slug?: string;
  nextChapterId?: string | null;
  prevChapterId?: string | null;
  chapterTitle?: string;
  chapterNumber?: string;
  chapters?: Chapter[];
}

export function MangaReaderClient({ 
  pages, 
  chapterId, 
  mangaId, 
  slug,
  nextChapterId,
  prevChapterId,
  chapterTitle,
  chapterNumber,
  chapters = []
}: MangaReaderClientProps) {
  const router = useRouter();
  const [activePage, setActivePage] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reader Customization Settings
  const [readingMode, setReadingMode] = useState<'vertical' | 'single' | 'double'>('vertical');
  const [maxImageWidth, setMaxImageWidth] = useState<'small' | 'medium' | 'large' | 'full'>('medium');
  const [readerTheme, setReaderTheme] = useState<'black' | 'dark' | 'sepia'>('black');
  const [pageGap, setPageGap] = useState<'none' | 'small' | 'medium'>('none');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);
  const autoPlayCancelled = useRef(false);

  // Load preferences from localStorage & setup listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedMode = localStorage.getItem('mangashadow-reader-mode');
    const savedWidth = localStorage.getItem('mangashadow-reader-width');
    const savedTheme = localStorage.getItem('mangashadow-reader-theme');
    const savedGap = localStorage.getItem('mangashadow-reader-gap');

    if (savedMode) setReadingMode(savedMode as any);
    if (savedWidth) setMaxImageWidth(savedWidth as any);
    if (savedTheme) setReaderTheme(savedTheme as any);
    if (savedGap) setPageGap(savedGap as any);

    // Sync fullscreen state
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Sync screen resize for mobile double page check
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const changeReadingMode = (mode: 'vertical' | 'single' | 'double') => {
    setReadingMode(mode);
    localStorage.setItem('mangashadow-reader-mode', mode);
    setActivePage(1);
  };
  const changeImageWidth = (width: 'small' | 'medium' | 'large' | 'full') => {
    setMaxImageWidth(width);
    localStorage.setItem('mangashadow-reader-width', width);
  };
  const changeReaderTheme = (theme: 'black' | 'dark' | 'sepia') => {
    setReaderTheme(theme);
    localStorage.setItem('mangashadow-reader-theme', theme);
  };
  const changePageGap = (gap: 'none' | 'small' | 'medium') => {
    setPageGap(gap);
    localStorage.setItem('mangashadow-reader-gap', gap);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (settingsOpen || chaptersOpen) return;

      if (e.key === "Escape") {
        setControlsVisible(true);
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        setControlsVisible((prev) => !prev);
        return;
      }

      if (readingMode === 'vertical') {
        if (e.key === 'ArrowRight' && nextChapterId) {
          router.push(`/manga/read/${mangaId}/${slug}/${nextChapterId}`);
        } else if (e.key === 'ArrowLeft' && prevChapterId) {
          router.push(`/manga/read/${mangaId}/${slug}/${prevChapterId}`);
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handlePrevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readingMode, activePage, pages.length, nextChapterId, prevChapterId, settingsOpen, chaptersOpen]);

  // Save progress (page-level) on activity
  useEffect(() => {
    if (typeof window === "undefined" || !mangaId || !chapterId || pages.length === 0) return;

    const totalPages = pages.length;
    const pageNumber = Math.min(activePage, totalPages);
    const percent = readingMode === "vertical"
      ? progress
      : Math.min(100, (pageNumber / totalPages) * 100);
    const completed = readingMode === "vertical"
      ? percent >= 99.5 || pageNumber >= totalPages
      : activePage > totalPages || percent >= 99.5;

    try {
      const saved = localStorage.getItem("mangashadow-progress");
      const progressMap = saved ? JSON.parse(saved) : {};

      progressMap[mangaId] = {
        chapterId,
        chapterNumber: chapterNumber || chapterId.split("-").pop() || "",
        chapterTitle: chapterTitle || "",
        readAt: new Date().toISOString(),
        pageNumber,
        totalPages,
        percent,
        completed
      };

      localStorage.setItem("mangashadow-progress", JSON.stringify(progressMap));
    } catch (e) {
      console.error("Failed to save manga progress:", e);
    }
  }, [mangaId, chapterId, chapterNumber, chapterTitle, pages.length, activePage, progress, readingMode]);

  // Track scroll (Vertical Mode only)
  useEffect(() => {
    if (readingMode !== 'vertical') return;

    const handleScroll = () => {
      if (!scrollRef.current) return;
      
      const scrollPos = window.scrollY;
      const windowHeight = window.innerHeight;
      const totalHeight = document.documentElement.scrollHeight - windowHeight;
      
      if (totalHeight > 0) {
        setProgress(Math.min(100, Math.max(0, (scrollPos / totalHeight) * 100)));
      }

      // Find active page in viewport
      const current = pageRefs.current.findIndex((ref) => {
        if (!ref) return false;
        const rect = ref.getBoundingClientRect();
        return rect.top >= -windowHeight / 2 && rect.top <= windowHeight / 2;
      });

      if (current !== -1) setActivePage(current + 1);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [readingMode]);

  // Track progress (Single/Double modes)
  useEffect(() => {
    if (readingMode === 'vertical') return;
    const progressVal = pages.length > 0 ? (activePage / pages.length) * 100 : 0;
    setProgress(progressVal);
  }, [activePage, readingMode, pages.length]);

  // Autoplay countdown trigger
  // Whether we're on the end-of-chapter slide (for paged modes)
  const isOnEndSlide = readingMode !== 'vertical' && activePage > pages.length;

  useEffect(() => {
    if (!nextChapterId || autoPlayCancelled.current) return;
    
    const isAtEnd = readingMode === 'vertical' 
      ? progress >= 99.5 
      : isOnEndSlide;
    
    if (isAtEnd && autoPlayCountdown === null) {
      setAutoPlayCountdown(5);
    } else if (!isAtEnd && autoPlayCountdown !== null) {
      setAutoPlayCountdown(null);
    }
  }, [progress, activePage, readingMode, nextChapterId, autoPlayCountdown, pages.length, isMobile, isOnEndSlide]);

  // Autoplay tick timer
  useEffect(() => {
    if (autoPlayCountdown === null) return;
    if (autoPlayCountdown === 0) {
      const nextUrl = `/manga/read/${mangaId}/${slug}/${nextChapterId}`;
      router.push(nextUrl);
      return;
    }

    const interval = setInterval(() => {
      setAutoPlayCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [autoPlayCountdown, nextChapterId, mangaId, slug, router]);

  const handleCancelAutoPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    autoPlayCancelled.current = true;
    setAutoPlayCountdown(null);
  };

  const handleReadNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextUrl = `/manga/read/${mangaId}/${slug}/${nextChapterId}`;
    router.push(nextUrl);
  };

  // Nav helpers for paging modes — allows going 1 past the last page to the end-of-chapter slide
  const handleNextPage = () => {
    if (readingMode === 'single' || isMobile) {
      if (activePage <= pages.length) {
        setActivePage((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    } else if (readingMode === 'double') {
      if (activePage === 1) {
        setActivePage(2);
      } else if (activePage + 2 <= pages.length) {
        setActivePage((prev) => prev + 2);
      } else if (activePage <= pages.length) {
        // Go to end slide
        setActivePage(pages.length + 1);
      }
    }
  };

  const handlePrevPage = () => {
    if (readingMode === 'single' || isMobile) {
      if (isOnEndSlide) {
        setActivePage(pages.length);
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else if (activePage > 1) {
        setActivePage((prev) => prev - 1);
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else if (prevChapterId) {
        router.push(`/manga/read/${mangaId}/${slug}/${prevChapterId}`);
      }
    } else if (readingMode === 'double') {
      if (isOnEndSlide) {
        // Go back to last real page(s)
        const lastDoublePage = pages.length % 2 === 0 ? pages.length - 1 : pages.length;
        setActivePage(Math.max(2, lastDoublePage));
      } else if (activePage === 2) {
        setActivePage(1);
      } else if (activePage > 2) {
        setActivePage((prev) => prev - 2);
      } else if (prevChapterId) {
        router.push(`/manga/read/${mangaId}/${slug}/${prevChapterId}`);
      }
    }
  };

  // Jump from progress scrubber slider
  const handlePageScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setActivePage(val);
    
    if (readingMode === 'vertical' && pageRefs.current[val - 1]) {
      pageRefs.current[val - 1]?.scrollIntoView({ behavior: 'instant' });
    }
  };

  // Toggle controls visibility on main screen click
  const handleMainScreenClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;

    if (readingMode !== 'vertical') {
      const clickX = e.clientX;
      const windowWidth = window.innerWidth;
      // Click left 25% -> Prev page
      if (clickX < windowWidth * 0.25) {
        handlePrevPage();
        return;
      }
      // Click right 25% -> Next page
      if (clickX > windowWidth * 0.75) {
        handleNextPage();
        return;
      }
    }

    setControlsVisible(!controlsVisible);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Theme styling definitions
  const themeBgMap = {
    black: "bg-[#020202] text-white",
    dark: "bg-[#0e0e11] text-zinc-200",
    sepia: "bg-[#181512] text-[#d4c5b9]"
  };

  const themePanelBgMap = {
    black: "bg-[#09090b]/95 border-white/5",
    dark: "bg-[#141419]/95 border-white/10",
    sepia: "bg-[#201b16]/95 border-[#d4c5b9]/10"
  };

  const themeActiveTextMap = {
    black: "text-primary",
    dark: "text-primary",
    sepia: "text-amber-500"
  };

  const themePrimaryButtonMap = {
    black: "bg-primary text-white",
    dark: "bg-primary text-white",
    sepia: "bg-amber-600 text-white"
  };

  const widthClassMap = {
    small: "max-w-[640px]",
    medium: "max-w-[800px]",
    large: "max-w-[1000px]",
    full: "max-w-none w-full"
  };

  const gapClassMap = {
    none: "space-y-0",
    small: "space-y-4 py-4",
    medium: "space-y-8 py-8"
  };

  const currentThemeBg = themeBgMap[readerTheme];
  const currentPanelBg = themePanelBgMap[readerTheme];
  const currentActiveText = themeActiveTextMap[readerTheme];
  const currentPrimaryBtn = themePrimaryButtonMap[readerTheme];

  // Helper to render double page content side by side
  const renderDoublePages = () => {
    // If screen size is mobile, double page falls back to single page view
    if (isMobile) {
      return (
        <div className="flex justify-center min-h-[80vh] items-center px-4">
          <div className={`${widthClassMap[maxImageWidth]} w-full`}>
            <Image
              src={pages[activePage - 1]?.img ? `/api/proxy?url=${encodeURIComponent(pages[activePage - 1].img)}` : ""}
              alt={`Page ${activePage}`}
              width={1200}
              height={1800}
              className="w-full h-auto object-contain mx-auto rounded-lg shadow-2xl"
              priority
              unoptimized
            />
          </div>
        </div>
      );
    }

    // Page 1 is cover
    if (activePage === 1) {
      return (
        <div className="flex justify-center min-h-[80vh] items-center">
          <div className={`${widthClassMap[maxImageWidth]} relative w-full h-auto px-4`}>
            <Image
              src={pages[0]?.img ? `/api/proxy?url=${encodeURIComponent(pages[0].img)}` : ""}
              alt="Page 1"
              width={1200}
              height={1800}
              className="w-full h-auto object-contain mx-auto rounded-lg shadow-2xl"
              priority
              unoptimized
            />
          </div>
        </div>
      );
    }

    const firstImg = pages[activePage - 1];
    const secondImg = pages[activePage]; 

    return (
      <div className="flex flex-col md:flex-row justify-center items-center min-h-[80vh] gap-6 px-6 w-full">
        {/* Left Page (even index) */}
        <div className="w-full md:w-1/2 flex justify-end">
          <div className="max-w-[580px] w-full">
            <Image
              src={firstImg?.img ? `/api/proxy?url=${encodeURIComponent(firstImg.img)}` : ""}
              alt={`Page ${activePage}`}
              width={1200}
              height={1800}
              className="w-full h-auto object-contain ml-auto rounded-2xl shadow-2xl border border-white/5"
              priority
              unoptimized
            />
          </div>
        </div>

        {/* Right Page (odd index) */}
        {secondImg && (
          <div className="w-full md:w-1/2 flex justify-start">
            <div className="max-w-[580px] w-full">
              <Image
                src={secondImg.img ? `/api/proxy?url=${encodeURIComponent(secondImg.img)}` : ""}
                alt={`Page ${activePage + 1}`}
                width={1200}
                height={1800}
                className="w-full h-auto object-contain mr-auto rounded-2xl shadow-2xl border border-white/5"
                priority
                unoptimized
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Reusable end-of-chapter UI block
  const renderEndOfChapter = () => (
    <div className="space-y-8 text-center" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 ring-8 ring-primary/5">
          <Menu className="w-6 h-6" />
        </div>
        <h3 className="text-3xl font-black uppercase italic tracking-tighter">End of Chapter</h3>
        <p className="text-white/30 text-sm max-w-xs mx-auto font-medium">You&apos;ve reached the end of this chapter. Ready for the next one?</p>
      </div>
      
      {/* Autoplay status banner */}
      {autoPlayCountdown !== null && (
        <div className={`max-w-xs mx-auto p-5 ${currentPanelBg} border rounded-3xl space-y-4 shadow-xl backdrop-blur-xl relative z-20`}>
          <div className="text-xs font-black uppercase tracking-widest text-primary flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            Next chapter in {autoPlayCountdown}s
          </div>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={handleCancelAutoPlay}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black rounded-xl uppercase tracking-widest border border-white/5 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleReadNow}
              className={`px-4 py-2 ${currentPrimaryBtn} text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg transition-all`}
            >
              Read Now
            </button>
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
        <Link 
          href={mangaId ? `/manga/${mangaId}/${slug || ''}` : '/manga'}
          className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl border border-white/5 uppercase tracking-widest text-xs transition-all"
        >
          Chapter List
        </Link>
        {nextChapterId ? (
          <Link 
            href={`/manga/read/${mangaId}/${slug}/${nextChapterId}`}
            className={`px-10 py-4 ${currentPrimaryBtn} font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs group hover:scale-105 transition-all flex items-center gap-3`}
          >
            Next Chapter
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : (
          <button 
            disabled 
            className="px-10 py-4 bg-white/5 text-white/20 font-black rounded-2xl border border-white/5 uppercase tracking-widest text-xs cursor-not-allowed flex items-center gap-3"
          >
            No Next Chapter
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${currentThemeBg} selection:bg-primary/30 font-sans transition-colors duration-300 relative overflow-x-hidden manga-theme`}>
      
      {/* Top Header Bar */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.header 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className={`fixed top-0 inset-x-0 z-[100] ${currentPanelBg} backdrop-blur-xl border-b p-4 shadow-lg`}
          >
            <div className="container mx-auto flex items-center justify-between">
              
              {/* Back Link & Manga title */}
              <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
                <Link 
                  href={mangaId ? `/manga/${mangaId}/${slug || ''}` : '/manga'}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors shrink-0"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Link>
                <div className="min-w-0">
                  <h1 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 truncate">
                    {slug?.replace(/-/g, ' ') || 'Manga Reader'}
                  </h1>
                </div>
              </div>

              {/* Central Chapter Switcher Dropdown Pill */}
              <div className="flex justify-center">
                <button 
                  onClick={() => { setChaptersOpen(!chaptersOpen); setSettingsOpen(false); }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-inner"
                >
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="truncate max-w-[100px] sm:max-w-[200px]">
                    {chapterNumber ? `Ch. ${chapterNumber}` : 'Select Chapter'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
              </div>

              {/* Utility Panel Buttons */}
              <div className="flex items-center gap-1.5 justify-end flex-1 sm:flex-initial">
                <button 
                  onClick={() => { setSettingsOpen(!settingsOpen); setChaptersOpen(false); }}
                  className={`p-2.5 rounded-full transition-all ${settingsOpen ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                  title="Reader Settings"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                <button 
                  onClick={toggleFullscreen}
                  className="p-2.5 hover:bg-white/5 rounded-full transition-all opacity-60 hover:opacity-100 hidden sm:inline-flex"
                  title="Fullscreen"
                >
                  {isFullscreen ? <X className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Chapters Dropdown Modal overlay */}
      <AnimatePresence>
        {chaptersOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChaptersOpen(false)}
              className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className={`fixed top-20 left-1/2 -translate-x-1/2 z-[120] w-[calc(100vw-2rem)] max-w-md max-h-[70vh] rounded-3xl ${currentPanelBg} border backdrop-blur-2xl shadow-2xl p-5 flex flex-col`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Chapters List</span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/10">
                  {chapters.length} Chapters
                </span>
              </div>
              <div className="space-y-1 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                {chapters.map((c) => {
                  const isActive = c.id === chapterId;
                  return (
                    <Link
                      key={c.id}
                      href={`/manga/read/${mangaId}/${slug}/${c.id}`}
                      onClick={() => setChaptersOpen(false)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${isActive ? 'bg-primary text-white font-black shadow-lg shadow-primary/20' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold">Chapter {c.number}</span>
                        {c.title && <span className={`text-[10px] font-medium opacity-65 mt-0.5 line-clamp-1`}>{c.title}</span>}
                      </div>
                      {isActive && <Check className="w-4 h-4 text-white" />}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Side Panel Drawer */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: 340 }}
              animate={{ x: 0 }}
              exit={{ x: 340 }}
              className={`fixed right-0 top-0 bottom-0 z-[150] w-full max-w-[340px] ${currentPanelBg} border-l backdrop-blur-2xl shadow-2xl p-6 overflow-y-auto flex flex-col justify-between`}
            >
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                  <span className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    Reader Settings
                  </span>
                  <button onClick={() => setSettingsOpen(false)} className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Reading Mode Segmented Control */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Reading Mode</label>
                  <div className="bg-white/5 p-1 rounded-2xl flex border border-white/5 w-full">
                    {(['vertical', 'single', 'double'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => changeReadingMode(mode)}
                        className={`flex-1 py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${readingMode === mode ? 'bg-white text-black font-black shadow-lg shadow-black/20' : 'text-white/40 hover:text-white/80'}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spacing Spans (Vertical mode only) */}
                {readingMode === 'vertical' && (
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Page Gaps</label>
                    <div className="bg-white/5 p-1 rounded-2xl flex border border-white/5 w-full">
                      {(['none', 'small', 'medium'] as const).map((gap) => (
                        <button
                          key={gap}
                          onClick={() => changePageGap(gap)}
                          className={`flex-1 py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pageGap === gap ? 'bg-white text-black font-black shadow-lg shadow-black/20' : 'text-white/40 hover:text-white/80'}`}
                        >
                          {gap === 'none' ? 'None' : gap}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image Max Width */}
                {readingMode !== 'double' && (
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Page Width Limit</label>
                    <div className="bg-white/5 p-1 rounded-2xl flex border border-white/5 w-full">
                      {(['small', 'medium', 'large', 'full'] as const).map((w) => (
                        <button
                          key={w}
                          onClick={() => changeImageWidth(w)}
                          className={`flex-1 py-2 text-center rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${maxImageWidth === w ? 'bg-white text-black font-black shadow-lg shadow-black/20' : 'text-white/40 hover:text-white/80'}`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reader Theme Segmented Control */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Reader Theme</label>
                  <div className="bg-white/5 p-1 rounded-2xl flex border border-white/5 w-full">
                    {(['black', 'dark', 'sepia'] as const).map((t) => {
                      const isActive = readerTheme === t;
                      return (
                        <button
                          key={t}
                          onClick={() => changeReaderTheme(t)}
                          className={`flex-1 py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-white text-black font-black shadow-lg shadow-black/20' : 'text-white/40 hover:text-white/80'}`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="pt-6 border-t border-white/5 text-[9px] opacity-35 font-bold uppercase tracking-widest leading-relaxed">
                Tip: Press Spacebar to toggle menus. Arrow keys or A/D turn pages in slider modes.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Pages Canvas Container */}
      <main 
        ref={scrollRef}
        onClick={handleMainScreenClick}
        className="relative w-full pt-16 pb-32 flex flex-col items-center"
      >
        {/* Reading Views */}
        {readingMode === 'vertical' ? (
          // Continuous scroll mode
          <div className={`w-full flex flex-col items-center ${gapClassMap[pageGap]}`}>
            {pages.map((page, index) => (
              <div 
                key={index}
                ref={(el) => { pageRefs.current[index] = el; }}
                className={`w-full flex justify-center overflow-hidden transition-all ${widthClassMap[maxImageWidth]} relative`}
              >
                <Image
                  src={page.img ? `/api/proxy?url=${encodeURIComponent(page.img)}` : ""}
                  alt={`Page ${page.page}`}
                  width={1200}
                  height={1800}
                  className="w-full h-auto select-none pointer-events-none"
                  priority={index < 2}
                  loading={index < 2 ? "eager" : "lazy"}
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : readingMode === 'single' ? (
          // Single page slideshow mode
          <div className="w-full flex justify-center py-8 min-h-[85vh] items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.12 }}
                className={`${isOnEndSlide ? 'max-w-xl' : widthClassMap[maxImageWidth]} relative w-full px-4`}
              >
                {isOnEndSlide ? (
                  renderEndOfChapter()
                ) : (
                  <Image
                    src={pages[activePage - 1]?.img ? `/api/proxy?url=${encodeURIComponent(pages[activePage - 1].img)}` : ""}
                    alt={`Page ${activePage}`}
                    width={1200}
                    height={1800}
                    className="w-full h-auto object-contain mx-auto rounded-2xl shadow-2xl border border-white/5"
                    priority
                    unoptimized
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          // Double page side-by-side mode (manga spread)
          <div className="w-full py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="w-full"
              >
                {isOnEndSlide ? (
                  <div className="flex justify-center min-h-[80vh] items-center">
                    <div className="max-w-xl w-full px-4">{renderEndOfChapter()}</div>
                  </div>
                ) : (
                  renderDoublePages()
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* End of Chapter (vertical mode only — paged modes show it inline as a slide) */}
        {readingMode === 'vertical' && (
          <div className="py-24 px-6 text-center space-y-8 w-full max-w-xl mx-auto" onClick={(e) => e.stopPropagation()}>
            {renderEndOfChapter()}
          </div>
        )}
      </main>

      {/* Bottom Progress Bar & Scrubber slider */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className={`fixed bottom-0 inset-x-0 z-[100] ${currentPanelBg} backdrop-blur-xl border-t p-4 shadow-lg`}
          >
            <div className="container mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              
              {/* Page scrubbing range slider */}
              <div className="flex-1 flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 shrink-0">Scrub</span>
                <input 
                  type="range"
                  min={1}
                  max={readingMode === 'vertical' ? (pages.length || 1) : (pages.length + 1)}
                  value={Math.min(activePage, pages.length + 1)}
                  onChange={handlePageScrub}
                  className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary focus:outline-none [&::-webkit-slider-runnable-track]:bg-white/5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/20 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-md"
                />
                <span className="text-xs font-black italic text-primary shrink-0 min-w-[50px] text-right">
                  {isOnEndSlide ? 'END' : activePage} / {pages.length}
                </span>
              </div>
              
              {/* Next/Prev page navigation controls */}
              <div className="flex items-center justify-between sm:justify-start gap-4 shrink-0 border-t border-white/5 sm:border-none pt-3 sm:pt-0">
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={handlePrevPage}
                     disabled={activePage === 1 && !prevChapterId}
                     className="p-3 bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95 disabled:opacity-20 disabled:hover:scale-100 rounded-full transition-all border border-white/5 flex items-center justify-center"
                     title="Prev Page / Chapter"
                   >
                     <ChevronLeft className="w-4 h-4" />
                   </button>
                   <button 
                     onClick={handleNextPage}
                     disabled={isOnEndSlide}
                     className="p-3 bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95 disabled:opacity-20 disabled:hover:scale-100 rounded-full transition-all border border-white/5 flex items-center justify-center"
                     title="Next Page / Chapter"
                   >
                     <ChevronRight className="w-4 h-4" />
                   </button>
                 </div>
                 
                 {/* Page indicator text */}
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                   Page Mode: <span className="text-primary font-black capitalize">{readingMode}</span>
                 </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Indicator Pill when Controls are Hidden */}
      {!controlsVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] px-5 py-2.5 bg-black/60 backdrop-blur-xl rounded-full text-[10px] font-black uppercase tracking-[0.25em] text-white/30 border border-white/5 shadow-2xl flex items-center gap-3">
          <span>{isOnEndSlide ? 'End of Chapter' : `Page ${activePage} of ${pages.length}`}</span>
          <span className="opacity-20">|</span>
          <span className="text-primary tracking-normal font-black uppercase">{readingMode}</span>
        </div>
      )}

      {/* Desktop Edge Hover Zones */}
      {readingMode !== 'vertical' && !isMobile && (
        <>
          {/* Left Hover Zone */}
          <div 
            onClick={(e) => { e.stopPropagation(); handlePrevPage(); }}
            className="fixed left-0 top-16 bottom-20 w-[15vw] max-w-[200px] z-40 flex items-center justify-start pl-6 group/prevcol cursor-pointer pointer-events-auto"
          >
            <div className="w-12 h-12 rounded-full bg-black/60 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover/prevcol:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover/prevcol:translate-x-0 backdrop-blur-sm shadow-2xl">
              <ChevronLeft className="w-6 h-6" />
            </div>
          </div>

          {/* Right Hover Zone */}
          <div 
            onClick={(e) => { e.stopPropagation(); handleNextPage(); }}
            className="fixed right-0 top-16 bottom-20 w-[15vw] max-w-[200px] z-40 flex items-center justify-center pr-6 group/nextcol pointer-events-auto"
          >
            <div className="w-12 h-12 rounded-full bg-black/60 border border-white/10 text-white flex items-center justify-center opacity-0 group-hover/nextcol:opacity-100 transition-all duration-300 transform translate-x-2 group-hover/nextcol:translate-x-0 backdrop-blur-sm shadow-2xl">
              <ChevronRight className="w-6 h-6" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
