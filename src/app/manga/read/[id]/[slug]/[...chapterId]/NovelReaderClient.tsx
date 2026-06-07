"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Check, 
  Maximize, 
  ChevronDown,
  Type,
  Plus,
  Minus,
  X,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Chapter {
  id: string;
  number: string;
  title?: string;
}

interface NovelReaderClientProps {
  contentHtml: string;
  chapterId: string;
  mangaId?: string;
  slug?: string;
  nextChapterId?: string | null;
  prevChapterId?: string | null;
  chapterTitle?: string;
  chapterNumber?: string;
  chapters?: Chapter[];
}

export function NovelReaderClient({ 
  contentHtml, 
  chapterId, 
  mangaId, 
  slug,
  nextChapterId,
  prevChapterId,
  chapterTitle,
  chapterNumber,
  chapters = []
}: NovelReaderClientProps) {
  const router = useRouter();
  const [controlsVisible, setControlsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const lastScrollY = useRef(0);

  // Settings states
  const [fontSize, setFontSize] = useState(18); // default font size in px
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [lineHeight, setLineHeight] = useState<'tight' | 'normal' | 'relaxed'>('relaxed');
  const [readerTheme, setReaderTheme] = useState<'black' | 'dark' | 'sepia' | 'light'>('dark');
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSize = localStorage.getItem('novel-reader-fontsize');
    const savedFamily = localStorage.getItem('novel-reader-fontfamily');
    const savedLine = localStorage.getItem('novel-reader-lineheight');
    const savedTheme = localStorage.getItem('novel-reader-theme');

    if (savedSize) setFontSize(parseInt(savedSize));
    if (savedFamily) setFontFamily(savedFamily as any);
    if (savedLine) setLineHeight(savedLine as any);
    if (savedTheme) setReaderTheme(savedTheme as any);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Save preferences when changed
  const updateFontSize = (size: number) => {
    const nextSize = Math.max(12, Math.min(32, size));
    setFontSize(nextSize);
    localStorage.setItem('novel-reader-fontsize', nextSize.toString());
  };

  const updateFontFamily = (family: 'serif' | 'sans' | 'mono') => {
    setFontFamily(family);
    localStorage.setItem('novel-reader-fontfamily', family);
  };

  const updateLineHeight = (line: 'tight' | 'normal' | 'relaxed') => {
    setLineHeight(line);
    localStorage.setItem('novel-reader-lineheight', line);
  };

  const updateTheme = (theme: 'black' | 'dark' | 'sepia' | 'light') => {
    setReaderTheme(theme);
    localStorage.setItem('novel-reader-theme', theme);
  };

  // Scroll logic to show/hide controls and save progress
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight - windowHeight;

      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setControlsVisible(false);
      } else {
        setControlsVisible(true);
      }
      lastScrollY.current = currentScrollY;

      if (docHeight > 0) {
        const percent = Math.min(100, Math.max(0, (currentScrollY / docHeight) * 100));
        setProgress(percent);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

      if (e.key === 'ArrowRight' && nextChapterId) {
        router.push(`/manga/read/${mangaId}/${slug}/${nextChapterId}`);
      } else if (e.key === 'ArrowLeft' && prevChapterId) {
        router.push(`/manga/read/${mangaId}/${slug}/${prevChapterId}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextChapterId, prevChapterId, mangaId, slug, router, settingsOpen, chaptersOpen]);

  // Track progress locally
  useEffect(() => {
    if (typeof window === "undefined" || !mangaId || !chapterId) return;

    try {
      const saved = localStorage.getItem("mangashadow-progress");
      const progressMap = saved ? JSON.parse(saved) : {};

      progressMap[mangaId] = {
        chapterId,
        chapterNumber: chapterNumber || chapterId.split("-").pop() || "",
        chapterTitle: chapterTitle || "",
        readAt: new Date().toISOString(),
        pageNumber: 1,
        totalPages: 1,
        percent: progress,
        completed: progress >= 95
      };

      localStorage.setItem("mangashadow-progress", JSON.stringify(progressMap));
    } catch (e) {
      console.error("Failed to save novel reading progress:", e);
    }
  }, [mangaId, chapterId, chapterNumber, chapterTitle, progress]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const themeBgMap = {
    black: "bg-[#020202] text-zinc-300",
    dark: "bg-[#0e0e11] text-zinc-300",
    sepia: "bg-[#f4ebd0] text-[#4f3824]",
    light: "bg-[#fcfcfc] text-[#1a1a1a]"
  };

  const themePanelBgMap = {
    black: "bg-[#0a0a0c]/95 border-white/5 text-white",
    dark: "bg-[#141419]/95 border-white/10 text-white",
    sepia: "bg-[#e5d8b6]/95 border-[#8b7355]/20 text-[#4f3824]",
    light: "bg-[#f0f0f0]/95 border-black/5 text-[#1a1a1a]"
  };

  const themeTextMutedMap = {
    black: "text-zinc-500",
    dark: "text-zinc-500",
    sepia: "text-[#8b7355]",
    light: "text-zinc-400"
  };

  const themeLineHeightMap = {
    tight: "leading-relaxed",
    normal: "leading-loose",
    relaxed: "leading-[2.2]"
  };

  const themeFontFamilyMap = {
    serif: "font-serif Georgia, 'Times New Roman', serif",
    sans: "font-sans system-ui, sans-serif",
    mono: "font-mono Menlo, Monaco, monospace"
  };

  const themeBorderMap = {
    black: "border-white/5",
    dark: "border-white/10",
    sepia: "border-[#4f3824]/10",
    light: "border-black/5"
  };

  const currentThemeBg = themeBgMap[readerTheme];
  const currentPanelBg = themePanelBgMap[readerTheme];
  const currentTextMuted = themeTextMutedMap[readerTheme];
  const currentLineHeight = themeLineHeightMap[lineHeight];
  const currentFontFamily = themeFontFamilyMap[fontFamily];
  const currentBorder = themeBorderMap[readerTheme];

  const sortedChapters = [...chapters];

  return (
    <div className={`min-h-screen ${currentThemeBg} transition-colors duration-300 relative pb-32 reader-theme`}>
      
      {/* Top Header Bar */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.header 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className={`fixed top-0 inset-x-0 z-[100] ${currentPanelBg} border-b ${currentBorder} backdrop-blur-xl p-4 shadow-lg`}
          >
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Link 
                  href={mangaId ? `/manga/${mangaId}/${slug || ''}` : '/manga'}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors shrink-0"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Link>
                <div className="min-w-0">
                  <h1 className="text-[10px] font-black uppercase tracking-[0.25em] opacity-50 truncate">
                    {slug?.replace(/-/g, ' ') || 'Novel Reader'}
                  </h1>
                </div>
              </div>

              {/* Central Selector Dropdown Pill */}
              <div className="flex justify-center">
                <button 
                  onClick={() => { setChaptersOpen(!chaptersOpen); setSettingsOpen(false); }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-inner"
                >
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="truncate max-w-[120px] sm:max-w-[200px]">
                    {chapterNumber ? `Ch. ${chapterNumber}` : 'Select Chapter'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
              </div>

              {/* Utility buttons */}
              <div className="flex items-center gap-1.5 justify-end">
                <button 
                  onClick={() => { setSettingsOpen(!settingsOpen); setChaptersOpen(false); }}
                  className={`p-2.5 rounded-full transition-all ${settingsOpen ? 'bg-primary/25 text-primary' : 'hover:bg-white/5'}`}
                  title="Typography Settings"
                >
                  <Type className="w-4 h-4" />
                </button>
                <button 
                  onClick={toggleFullscreen}
                  className="p-2.5 hover:bg-white/5 rounded-full transition-all hidden sm:inline-flex"
                  title="Fullscreen"
                >
                  {isFullscreen ? <X className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Chapters Overlay Modal */}
      <AnimatePresence>
        {chaptersOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChaptersOpen(false)}
              className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className={`fixed top-20 left-1/2 -translate-x-1/2 z-[120] w-[calc(100vw-2rem)] max-w-md max-h-[70vh] rounded-3xl ${currentPanelBg} border ${currentBorder} backdrop-blur-2xl shadow-2xl p-5 flex flex-col`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${currentBorder} mb-3`}>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Chapters List</span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/10">
                  {chapters.length} Chapters
                </span>
              </div>
              <div className="space-y-1 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                {sortedChapters.map((c) => {
                  const isActive = c.id === chapterId;
                  return (
                    <Link
                      key={c.id}
                      href={`/manga/read/${mangaId}/${slug}/${c.id}`}
                      onClick={() => setChaptersOpen(false)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${isActive ? 'bg-primary text-white font-black shadow-lg shadow-primary/20' : 'hover:bg-white/5 opacity-80 hover:opacity-100'}`}
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold">Chapter {c.number}</span>
                        {c.title && <span className="text-[10px] font-medium opacity-65 mt-0.5 line-clamp-1">{c.title}</span>}
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

      {/* Typography settings panel */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ x: 340 }}
              animate={{ x: 0 }}
              exit={{ x: 340 }}
              className={`fixed right-0 top-0 bottom-0 z-[150] w-full max-w-[340px] ${currentPanelBg} border-l ${currentBorder} backdrop-blur-2xl shadow-2xl p-6 overflow-y-auto flex flex-col justify-between`}
            >
              <div className="space-y-6">
                <div className={`flex items-center justify-between pb-4 border-b ${currentBorder}`}>
                  <span className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    Reader Settings
                  </span>
                  <button onClick={() => setSettingsOpen(false)} className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Reader Theme</label>
                  <div className="grid grid-cols-4 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5 w-full">
                    {(['black', 'dark', 'sepia', 'light'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => updateTheme(t)}
                        className={`py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all capitalize ${readerTheme === t ? 'bg-white text-black font-black shadow-lg shadow-black/20' : 'opacity-40 hover:opacity-85'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Font Size</label>
                  <div className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-2xl border border-white/5 w-full">
                    <button 
                      onClick={() => updateFontSize(fontSize - 1)}
                      className="p-2 hover:bg-white/5 rounded-xl transition-all active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-black tracking-tighter">{fontSize}px</span>
                    <button 
                      onClick={() => updateFontSize(fontSize + 1)}
                      className="p-2 hover:bg-white/5 rounded-xl transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Font Family</label>
                  <div className="bg-white/5 p-1 rounded-2xl flex border border-white/5 w-full">
                    {(['serif', 'sans', 'mono'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => updateFontFamily(f)}
                        className={`flex-1 py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${fontFamily === f ? 'bg-white text-black font-black shadow-lg' : 'opacity-40 hover:opacity-85'}`}
                      >
                        {f === 'serif' ? 'Bookish' : f === 'sans' ? 'Modern' : 'Tech'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Line Spacing</label>
                  <div className="bg-white/5 p-1 rounded-2xl flex border border-white/5 w-full">
                    {(['tight', 'normal', 'relaxed'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => updateLineHeight(l)}
                        className={`flex-1 py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${lineHeight === l ? 'bg-white text-black font-black shadow-lg' : 'opacity-40 hover:opacity-85'}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 text-[9px] opacity-35 font-bold uppercase tracking-widest leading-relaxed">
                Controls automatically hide on scroll down. Swipe/click near edge to flip pages.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chapter Content Container */}
      <main className="container mx-auto px-5 md:px-8 max-w-3xl pt-28 md:pt-36">
        <div className="mb-10 text-center">
          <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight italic opacity-95">
            {chapterTitle || `Chapter ${chapterNumber}`}
          </h2>
          <div className="h-[2px] w-12 bg-primary mx-auto mt-6 opacity-60 rounded-full" />
        </div>

        <article 
          style={{ fontSize: `${fontSize}px` }}
          className={`${currentFontFamily} ${currentLineHeight} break-words whitespace-pre-wrap select-text focus:outline-none`}
        >
          <div 
            dangerouslySetInnerHTML={{ __html: contentHtml }}
            className="space-y-6 md:space-y-8 novel-body"
          />
        </article>

        {/* Chapter Navigation Buttons */}
        <div className="mt-16 pt-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
          {prevChapterId ? (
            <Link 
              href={`/manga/read/${mangaId}/${slug}/${prevChapterId}`}
              className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all duration-300 border border-white/5"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Chapter
            </Link>
          ) : (
            <button 
              disabled
              className="w-full sm:w-auto px-6 py-4 opacity-20 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] cursor-not-allowed border border-white/5"
            >
              <ChevronLeft className="w-4 h-4" />
              First Chapter
            </button>
          )}

          <Link 
            href={mangaId ? `/manga/${mangaId}/${slug}` : "/manga"}
            className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all duration-300 border border-white/5"
          >
            Chapter List
          </Link>

          {nextChapterId ? (
            <Link 
              href={`/manga/read/${mangaId}/${slug}/${nextChapterId}`}
              className="w-full sm:w-auto px-6 py-4 bg-primary text-white hover:bg-primary/95 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all duration-300 shadow-xl shadow-primary/10"
            >
              Next Chapter
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button 
              disabled
              className="w-full sm:w-auto px-6 py-4 opacity-20 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] cursor-not-allowed border border-white/5"
            >
              Last Chapter
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>

      {/* Progress tracking line bar */}
      <div 
        className="fixed bottom-0 left-0 h-1 bg-primary transition-all duration-100 z-50 shadow-[0_0_8px_var(--color-primary)]"
        style={{ width: `${progress}%` }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .novel-body p {
          margin-bottom: 1.5em;
          text-indent: 0.5em;
          line-height: inherit;
        }
        .novel-body p:last-child {
          margin-bottom: 0;
        }
      `}} />
    </div>
  );
}
