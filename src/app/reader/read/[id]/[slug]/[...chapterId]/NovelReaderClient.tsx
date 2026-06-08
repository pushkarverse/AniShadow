"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import {
  WITCHCULT_NOVEL_ID,
  findReaderChapter,
  getChapterDisplayTitle,
  getChapterShortTitle,
  getReaderChapterPath,
  readerChapterIdsMatch
} from "@/lib/rezero";

interface Chapter {
  id: string;
  number: string;
  title?: string;
  arc?: number;
  arcTitle?: string;
  chapterInArc?: number;
}

interface ReaderArc {
  number: number;
  title: string;
  chapters: Chapter[];
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
  arcs?: ReaderArc[];
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
  chapters = [],
  arcs = []
}: NovelReaderClientProps) {
  const router = useRouter();
  const [controlsVisible, setControlsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const lastScrollY = useRef(0);
  const articleRef = useRef<HTMLDivElement>(null);

  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [lineHeight, setLineHeight] = useState<'tight' | 'normal' | 'relaxed'>('relaxed');
  const [readerTheme, setReaderTheme] = useState<'black' | 'dark' | 'sepia' | 'light'>('dark');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [selectedArc, setSelectedArc] = useState<number>(arcs[0]?.number || 1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isReZero = mangaId === WITCHCULT_NOVEL_ID;
  const isArcWise = arcs.length > 0;
  const currentChapter = findReaderChapter(chapters, chapterId);

  const displayedChapters = useMemo(() => {
    if (!isArcWise) return chapters;
    return chapters.filter((c) => c.arc === selectedArc);
  }, [chapters, isArcWise, selectedArc]);

  const proxiedContentHtml = useMemo(() => {
    if (!contentHtml) return "";

    return contentHtml.replace(/<img\s+([^>]*?)>/gi, (imgTag) => {
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      const dataSrcMatch = imgTag.match(/data-src=["']([^"']+)["']/i);
      const dataLazySrcMatch = imgTag.match(/data-lazy-src=["']([^"']+)["']/i);

      const rawSrc = dataLazySrcMatch?.[1] || dataSrcMatch?.[1] || srcMatch?.[1];
      if (!rawSrc || rawSrc.startsWith("data:")) return imgTag;

      const isAllowedHost = rawSrc.includes("witchculttranslation.com") || rawSrc.includes("eminenttranslations.com");
      if (!isAllowedHost) {
        return "";
      }
      const finalUrl = `/api/proxy?url=${encodeURIComponent(rawSrc)}`;

      let newTag = imgTag;

      newTag = newTag.replace(/src=["']([^"']+)["']/gi, "");
      newTag = newTag.replace(/data-src=["']([^"']+)["']/gi, "");
      newTag = newTag.replace(/data-lazy-src=["']([^"']+)["']/gi, "");
      newTag = newTag.replace(/srcset=["']([^"']+)["']/gi, "");

      newTag = newTag.replace(/<img/i, `<img src="${finalUrl}"`);
      return newTag;
    });
  }, [contentHtml]);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const handleImgError = (e: Event) => {
      const img = e.target as HTMLImageElement;
      img.style.display = 'none';
    };

    const imgs = article.querySelectorAll("img");
    imgs.forEach((img) => {
      if (img.naturalWidth === 0 && img.complete) {
        img.style.display = 'none';
      }
      img.addEventListener("error", handleImgError);
    });

    return () => {
      imgs.forEach((img) => {
        img.removeEventListener("error", handleImgError);
      });
    };
  }, [proxiedContentHtml]);

  useEffect(() => {
    if (currentChapter?.arc && isArcWise) {
      setSelectedArc(currentChapter.arc);
    }
  }, [currentChapter?.arc, isArcWise]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSize = localStorage.getItem('novel-reader-fontsize');
    const savedFamily = localStorage.getItem('novel-reader-fontfamily');
    const savedLine = localStorage.getItem('novel-reader-lineheight');
    const savedTheme = localStorage.getItem('novel-reader-theme');

    if (savedSize) setFontSize(parseInt(savedSize));
    if (savedFamily) setFontFamily(savedFamily as 'serif' | 'sans' | 'mono');
    if (savedLine) setLineHeight(savedLine as 'tight' | 'normal' | 'relaxed');
    if (savedTheme) setReaderTheme(savedTheme as 'black' | 'dark' | 'sepia' | 'light');

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

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
        router.push(getReaderChapterPath(mangaId!, slug!, nextChapterId));
      } else if (e.key === 'ArrowLeft' && prevChapterId) {
        router.push(getReaderChapterPath(mangaId!, slug!, prevChapterId));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextChapterId, prevChapterId, mangaId, slug, router, settingsOpen, chaptersOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || !mangaId || !chapterId) return;

    try {
      const saved = localStorage.getItem("mangashadow-progress");
      const progressMap = saved ? JSON.parse(saved) : {};

      progressMap[mangaId] = {
        chapterId,
        chapterNumber: chapterNumber || chapterId.split("-").pop() || "",
        chapterTitle: getChapterDisplayTitle(chapterId, currentChapter, chapterNumber) || "",
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
  }, [mangaId, chapterId, chapterNumber, currentChapter, progress]);

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
    black: isReZero ? "bg-[#08040f] text-zinc-300" : "bg-[#020202] text-zinc-300",
    dark: isReZero ? "bg-[#0f0818] text-zinc-300" : "bg-[#0e0e11] text-zinc-300",
    sepia: "bg-[#f4ebd0] text-[#4f3824]",
    light: "bg-[#fcfcfc] text-[#1a1a1a]"
  };

  const themePanelBgMap = {
    black: isReZero ? "bg-[#0d0618]/95 border-[#6b21a8]/20 text-white" : "bg-[#0a0a0c]/95 border-white/5 text-white",
    dark: isReZero ? "bg-[#140a22]/95 border-[#6b21a8]/25 text-white" : "bg-[#141419]/95 border-white/10 text-white",
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
    black: isReZero ? "border-[#6b21a8]/15" : "border-white/5",
    dark: isReZero ? "border-[#6b21a8]/20" : "border-white/10",
    sepia: "border-[#4f3824]/10",
    light: "border-black/5"
  };

  const currentThemeBg = themeBgMap[readerTheme];
  const currentPanelBg = themePanelBgMap[readerTheme];
  const currentTextMuted = themeTextMutedMap[readerTheme];
  const currentLineHeight = themeLineHeightMap[lineHeight];
  const currentFontFamily = themeFontFamilyMap[fontFamily];
  const currentBorder = themeBorderMap[readerTheme];

  const displayTitle = getChapterShortTitle(chapterId, currentChapter, chapterNumber);
  const headingTitle = getChapterDisplayTitle(chapterId, currentChapter, chapterNumber);
  const arcLabel = currentChapter?.arc
    ? `Arc ${currentChapter.arc}${currentChapter.arcTitle ? ` · ${currentChapter.arcTitle}` : ""}`
    : null;

  const headerLabel = isReZero ? "Re:Zero Web Novel" : (slug?.replace(/-/g, ' ') || 'Novel Reader');

  return (
    <div className={`min-h-screen ${currentThemeBg} transition-colors duration-300 relative pb-32 reader-theme novel-theme`}>

      <AnimatePresence>
        {controlsVisible && (
          <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className={`fixed top-0 inset-x-0 z-[100] ${currentPanelBg} border-b ${currentBorder} backdrop-blur-xl p-4 shadow-lg`}
          >
            <div className="container mx-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Link
                  href={mangaId ? `/reader/${mangaId}/${slug || ''}` : '/reader'}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors shrink-0"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Link>
                <div className="min-w-0 hidden sm:block">
                  <h1 className={`text-[10px] font-black uppercase tracking-[0.25em] truncate ${isReZero ? "text-[#c084fc]/70" : "opacity-50"}`}>
                    {headerLabel}
                  </h1>
                  {arcLabel && (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 truncate mt-0.5">
                      {arcLabel}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 shrink-0">
                {prevChapterId ? (
                  <Link
                    href={getReaderChapterPath(mangaId!, slug!, prevChapterId)}
                    className="p-2 hover:bg-white/5 rounded-full transition-all shrink-0 opacity-70 hover:opacity-100 active:scale-90"
                    title="Previous Chapter"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="p-2 opacity-15 rounded-full cursor-not-allowed shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => { setChaptersOpen(!chaptersOpen); setSettingsOpen(false); }}
                  className={`px-4 py-2 border rounded-full text-[11px] font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-inner max-w-[220px] ${isReZero
                    ? "bg-[#6b21a8]/20 hover:bg-[#6b21a8]/30 border-[#9333ea]/30 text-[#e9d5ff]"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
                    }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{displayTitle}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
                </button>

                {nextChapterId ? (
                  <Link
                    href={getReaderChapterPath(mangaId!, slug!, nextChapterId)}
                    className="p-2 hover:bg-white/5 rounded-full transition-all shrink-0 opacity-70 hover:opacity-100 active:scale-90"
                    title="Next Chapter"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="p-2 opacity-15 rounded-full cursor-not-allowed shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 justify-end flex-1">
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
              className={`fixed top-20 left-1/2 -translate-x-1/2 z-[120] w-[calc(100vw-2rem)] max-w-lg max-h-[75vh] rounded-3xl ${currentPanelBg} border ${currentBorder} backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden`}
            >
              <div className={`flex items-center justify-between p-5 pb-3 border-b ${currentBorder}`}>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Chapters</span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/10">
                  {displayedChapters.length} in view
                </span>
              </div>

              {isArcWise && (
                <div className="flex items-center justify-start gap-1.5 px-5 py-3 border-b border-white/5 overflow-x-auto custom-scrollbar shrink-0">
                  {arcs.map((arc) => (
                    <button
                      key={arc.number}
                      type="button"
                      onClick={() => setSelectedArc(arc.number)}
                      title={arc.title}
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${selectedArc === arc.number
                        ? "bg-primary text-white border-primary/40"
                        : "bg-white/5 text-white/40 border-white/5 hover:text-white"
                        }`}
                    >
                      Arc {arc.number}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-1 overflow-y-auto p-4 flex-1 custom-scrollbar">
                {displayedChapters.map((c) => {
                  const isActive = readerChapterIdsMatch(c.id, chapterId);
                  return (
                    <Link
                      key={c.id}
                      href={getReaderChapterPath(mangaId!, slug!, c.id)}
                      onClick={() => setChaptersOpen(false)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all ${isActive
                        ? isReZero
                          ? "bg-[#9333ea] text-white font-semibold shadow-lg shadow-[#9333ea]/20"
                          : "bg-primary text-white font-semibold shadow-lg shadow-primary/20"
                        : "hover:bg-white/5 opacity-80 hover:opacity-100"
                        }`}
                    >
                      <BookOpen className="w-4 h-4 shrink-0 opacity-70" />
                      <div className="flex flex-col text-left min-w-0 flex-1">
                        <span className="text-xs font-medium truncate">{getChapterDisplayTitle(c.id, c)}</span>
                        {c.arc && (
                          <span className="text-[9px] font-bold uppercase tracking-widest opacity-50 mt-0.5">
                            Arc {c.arc}{c.arcTitle ? ` · ${c.arcTitle}` : ""}
                          </span>
                        )}
                      </div>
                      {isActive && <Check className="w-4 h-4 shrink-0" />}
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
                Controls hide on scroll. Use arrow keys for prev/next chapter.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chapter Content */}
      <main className="container mx-auto px-5 md:px-8 max-w-[680px] pt-28 md:pt-36">
        {isReZero && (
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#6b21a8]/10 to-transparent pointer-events-none" />
        )}

        <div className="mb-12 text-center relative">
          {arcLabel && (
            <p className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-3 ${isReZero ? "text-[#c084fc]/60" : currentTextMuted}`}>
              {arcLabel}
            </p>
          )}
          <h2 className={`text-xl md:text-2xl font-serif font-medium tracking-tight ${isReZero ? "text-[#f3e8ff]" : "opacity-95"}`}>
            {headingTitle}
          </h2>
          <div className={`h-px w-16 mx-auto mt-6 rounded-full ${isReZero ? "bg-[#9333ea]/40" : "bg-primary/40"}`} />
        </div>

        <article
          ref={articleRef}
          style={{ fontSize: `${fontSize}px` }}
          className={`${currentFontFamily} ${currentLineHeight} break-words select-text focus:outline-none`}
        >
          <div
            dangerouslySetInnerHTML={{ __html: proxiedContentHtml }}
            className="space-y-6 md:space-y-8 novel-body"
          />
        </article>

        <div className={`mt-16 pt-10 border-t flex flex-col sm:flex-row items-center justify-between gap-4 select-none ${currentBorder}`}>
          {prevChapterId ? (
            <Link
              href={getReaderChapterPath(mangaId!, slug!, prevChapterId)}
              className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs transition-all duration-300 border border-white/5"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Link>
          ) : (
            <button
              disabled
              className="w-full sm:w-auto px-6 py-4 opacity-20 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs cursor-not-allowed border border-white/5"
            >
              <ChevronLeft className="w-4 h-4" />
              First Chapter
            </button>
          )}

          <Link
            href={mangaId ? `/reader/${mangaId}/${slug}` : "/reader"}
            className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs transition-all duration-300 border border-white/5"
          >
            All Chapters
          </Link>

          {nextChapterId ? (
            <Link
              href={getReaderChapterPath(mangaId!, slug!, nextChapterId)}
              className={`w-full sm:w-auto px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs transition-all duration-300 shadow-xl ${isReZero
                ? "bg-[#9333ea] text-white hover:bg-[#7e22ce] shadow-[#9333ea]/20"
                : "bg-primary text-white hover:bg-primary/95 shadow-primary/10"
                }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              disabled
              className="w-full sm:w-auto px-6 py-4 opacity-20 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs cursor-not-allowed border border-white/5"
            >
              Last Chapter
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>

      <div
        className={`fixed bottom-0 left-0 h-1 transition-all duration-100 z-50 ${isReZero ? "bg-[#9333ea] shadow-[0_0_8px_#9333ea]" : "bg-primary shadow-[0_0_8px_var(--color-primary)]"}`}
        style={{ width: `${progress}%` }}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
        .novel-body img {
          max-width: 100%;
          height: auto;
          margin: 2rem auto;
          display: block;
          border-radius: 1rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .novel-body p {
          margin-bottom: 1.5em;
          text-indent: 1.5em;
          line-height: inherit;
        }
        .novel-body p:first-of-type {
          text-indent: 0;
        }
        .novel-body p:last-child {
          margin-bottom: 0;
        }
        .novel-body em, .novel-body i {
          font-style: italic;
        }
        .novel-body strong, .novel-body b {
          font-weight: 600;
        }
      `}} />
    </div>
  );
}
