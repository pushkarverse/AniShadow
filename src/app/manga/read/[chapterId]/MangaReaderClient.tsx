"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Menu, Settings, Maximize2, X, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MangaReaderClientProps {
  pages: { page: number; img: string }[];
  chapterId: string;
  mangaId?: string;
}

export function MangaReaderClient({ pages, chapterId, mangaId }: MangaReaderClientProps) {
  const [activePage, setActivePage] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track scroll for progress and active page
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      
      const scrollPos = window.scrollY;
      const windowHeight = window.innerHeight;
      const totalHeight = document.documentElement.scrollHeight - windowHeight;
      
      setProgress(Math.min(100, Math.max(0, (scrollPos / totalHeight) * 100)));

      // Find active page
      const current = pageRefs.current.findIndex((ref) => {
        if (!ref) return false;
        const rect = ref.getBoundingClientRect();
        return rect.top >= -windowHeight / 2 && rect.top <= windowHeight / 2;
      });

      if (current !== -1) setActivePage(current + 1);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const hide = () => setControlsVisible(false);
    
    if (controlsVisible) {
      timeout = setTimeout(hide, 5000);
    }
    
    return () => clearTimeout(timeout);
  }, [controlsVisible]);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 manga-theme">
      {/* Top Navigation */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.header 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 inset-x-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4"
          >
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link 
                  href={mangaId ? `/manga/${mangaId}` : '/manga'}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Link>
                <div>
                  <h1 className="text-sm font-black uppercase tracking-widest text-white/90">Reading Mode</h1>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Chapter {chapterId.slice(0, 8)}...</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/5 rounded-full transition-colors" title="Settings">
                  <Settings className="w-5 h-5 opacity-40 hover:opacity-100" />
                </button>
                <button className="p-2 hover:bg-white/5 rounded-full transition-colors" title="Fullscreen">
                  <Maximize2 className="w-5 h-5 opacity-40 hover:opacity-100" />
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Pages Container (Vertical Scroll) */}
      <main 
        ref={scrollRef}
        className="max-w-screen-md mx-auto relative pt-0 pb-32 space-y-0"
        onMouseMove={() => setControlsVisible(true)}
        onClick={() => setControlsVisible(!controlsVisible)}
      >
        {pages.map((page, index) => (
          <div 
            key={index}
            ref={(el) => { pageRefs.current[index] = el; }}
            className="relative w-full min-h-[50vh] flex items-start justify-center overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
            <Image
              src={page.img}
              alt={`Page ${page.page}`}
              width={1200}
              height={1800}
              className="w-full h-auto select-none pointer-events-none"
              priority={index < 2}
              loading={index < 2 ? "eager" : "lazy"}
              unoptimized // Manga images often don't work well with Next.js optimizer due to cross-domain issues
            />
          </div>
        ))}

        {/* End of Chapter */}
        <div className="py-24 px-6 text-center space-y-8">
           <div className="flex flex-col items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 ring-8 ring-primary/5">
                <Menu className="w-6 h-6" />
             </div>
             <h3 className="text-3xl font-black uppercase italic tracking-tighter">End of Chapter</h3>
             <p className="text-white/30 text-sm max-w-xs mx-auto">You've reached the end of this chapter. Ready for the next one?</p>
           </div>
           
           <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
             <Link 
               href={mangaId ? `/manga/${mangaId}` : '/manga'}
               className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl border border-white/5 uppercase tracking-widest text-xs transition-all"
             >
               Chapter List
             </Link>
             <button className="px-10 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 uppercase tracking-widest text-xs group hover:scale-105 transition-all flex items-center gap-3">
               Next Chapter
               <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
             </button>
           </div>
        </div>
      </main>

      {/* Bottom Bar / Progress */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 inset-x-0 z-[100] bg-black/80 backdrop-blur-xl border-t border-white/5 p-4"
          >
            <div className="container mx-auto flex items-center gap-6">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Chapter Progress</span>
                  <span className="text-xs font-black italic text-primary">{activePage} / {pages.length}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    animate={{ width: `${(activePage / pages.length) * 100}%` }}
                    transition={{ type: "spring", damping: 20, stiffness: 100 }}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4 shrink-0">
                 <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all">
                   <ChevronLeft className="w-5 h-5" />
                 </button>
                 <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all">
                   <ChevronRight className="w-5 h-5" />
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll indicator for hidden controls */}
      {!controlsVisible && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[110] px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-white/20 border border-white/5 pointer-events-none">
          Page {activePage} of {pages.length}
        </div>
      )}
    </div>
  );
}
