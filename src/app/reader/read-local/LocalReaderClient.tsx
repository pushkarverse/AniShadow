"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, Sliders, Type, Minus, Plus, Settings, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getVolume, StoredVolume } from "@/lib/indexedDb";
import Script from "next/script";
import { motion, AnimatePresence } from "framer-motion";

interface LocalReaderClientProps {
  id: string;
  slug: string;
  vol: number;
}

export function LocalReaderClient({ id, slug, vol }: LocalReaderClientProps) {
  const [loading, setLoading] = useState(true);
  const [storedVolume, setStoredVolume] = useState<StoredVolume | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [libLoaded, setLibLoaded] = useState(false);
  const [epubRendition, setEpubRendition] = useState<any>(null);

  const [fontSize, setFontSize] = useState(100);
  const [theme, setTheme] = useState<"dark" | "sepia" | "light">("dark");
  const [fontFamily, setFontFamily] = useState<"serif" | "sans" | "mono">("serif");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  const bookInstanceRef = useRef<any>(null);

  useEffect(() => {
    async function loadFile() {
      try {
        const data = await getVolume(id, vol);
        if (data) {
          setStoredVolume(data);
          const url = URL.createObjectURL(data.fileBlob);
          setFileUrl(url);
        }
      } catch (err) {
        console.error("Failed to load local volume:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFile();

    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [id, vol]);

  useEffect(() => {
    if (!libLoaded || !fileUrl || !storedVolume || storedVolume.fileType.includes("pdf")) return;
    if (typeof window === "undefined" || !(window as any).ePub) return;

    if (bookInstanceRef.current) {
      try {
        bookInstanceRef.current.destroy();
      } catch (e) { }
    }

    try {
      const book = (window as any).ePub(storedVolume.fileBlob);
      bookInstanceRef.current = book;

      const rendition = book.renderTo(viewerRef.current, {
        width: "100%",
        height: "100%",
        spread: "none",
        flow: "scrolled-doc"
      });

      rendition.display();
      setEpubRendition(rendition);

      applyReaderStyles(rendition, theme, fontSize, fontFamily);

    } catch (err) {
      console.error("Error rendering EPUB:", err);
    }
  }, [libLoaded, fileUrl, storedVolume]);

  useEffect(() => {
    if (epubRendition) {
      applyReaderStyles(epubRendition, theme, fontSize, fontFamily);
    }
  }, [theme, fontSize, fontFamily, epubRendition]);

  const applyReaderStyles = (rendition: any, currentTheme: string, size: number, family: string) => {
    const bg = currentTheme === "dark" ? "#09090b" : currentTheme === "sepia" ? "#f4ebd0" : "#ffffff";
    const text = currentTheme === "dark" ? "#e4e4e7" : currentTheme === "sepia" ? "#4f3824" : "#18181b";
    const font = family === "serif" ? "Georgia, serif" : family === "sans" ? "system-ui, sans-serif" : "monospace";

    rendition.themes.default({
      body: {
        background: `${bg} !important`,
        color: `${text} !important`,
        "font-family": `${font} !important`,
        "font-size": `${size}% !important`,
        "line-height": "1.8 !important",
        padding: "20px 0 !important"
      },
      p: {
        "margin-bottom": "1.5em !important",
        "text-indent": "1.5em !important"
      },
      "p:first-of-type": {
        "text-indent": "0 !important"
      },
      h1: { "font-family": `${font} !important`, color: `${text} !important` },
      h2: { "font-family": `${font} !important`, color: `${text} !important` },
      h3: { "font-family": `${font} !important`, color: `${text} !important` }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/40 text-xs font-black uppercase tracking-widest">Loading stored file...</p>
        </div>
      </div>
    );
  }

  if (!storedVolume) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-3xl font-black text-primary uppercase italic mb-4 tracking-tighter">File Not Found</h1>
        <p className="text-white/40 text-sm max-w-sm mb-8">No uploaded file was found for this volume in your browser's local library.</p>
        <Link
          href={`/reader/${id}/${slug}`}
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
        >
          Go Back
        </Link>
      </div>
    );
  }

  const isPdf = storedVolume.fileType.includes("pdf");
  const titleText = `${slug.replace(/-/g, ' ')} - Volume ${vol}`;

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#09090b]" : theme === "sepia" ? "bg-[#f4ebd0]" : "bg-white"} flex flex-col`}>
      {/* Script for parsing EPUBs */}
      {!isPdf && (
        <Script
          src="https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js"
          strategy="lazyOnload"
          onLoad={() => setLibLoaded(true)}
        />
      )}

      {/* Header Controls Bar */}
      <header className={`px-6 py-4 flex items-center justify-between border-b ${theme === "dark" ? "bg-black/80 border-white/5 text-white" : theme === "sepia" ? "bg-[#e5d8b6]/80 border-[#8b7355]/20 text-[#4f3824]" : "bg-white/80 border-black/5 text-black"
        } backdrop-blur-xl sticky top-0 z-50`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href={`/reader/${id}/${slug}`}
            className="p-2 hover:bg-white/5 rounded-full transition-colors shrink-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xs font-black uppercase tracking-widest truncate">{titleText}</h1>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mt-0.5">
              Local {isPdf ? "PDF Reader" : "EPUB Reader"}
            </p>
          </div>
        </div>

        {/* EPUB customizer icon */}
        {!isPdf && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="p-2.5 hover:bg-white/5 rounded-full transition-all"
              title="Reader Customization"
            >
              <Type className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Settings Drawer */}
      <AnimatePresence>
        {settingsOpen && !isPdf && (
          <>
            <div onClick={() => setSettingsOpen(false)} className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-xs" />
            <motion.div
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              className={`fixed right-0 top-0 bottom-0 z-[150] w-full max-w-[300px] border-l p-6 shadow-2xl flex flex-col justify-between ${theme === "dark" ? "bg-[#0c0c0e] border-white/5 text-white" : theme === "sepia" ? "bg-[#e5d8b6] border-[#8b7355]/20 text-[#4f3824]" : "bg-white border-black/5 text-black"
                }`}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                  <span className="text-xs font-black uppercase tracking-widest">Reader Settings</span>
                  <button onClick={() => setSettingsOpen(false)} className="p-1 hover:bg-white/5 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Background</label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl">
                    {(["dark", "sepia", "light"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all capitalize ${theme === t ? "bg-primary text-white" : "opacity-55 hover:opacity-100"
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size Selector */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Font Size</label>
                  <div className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-xl">
                    <button onClick={() => setFontSize(Math.max(60, fontSize - 10))} className="p-1">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black">{fontSize}%</span>
                    <button onClick={() => setFontSize(Math.min(200, fontSize + 10))} className="p-1">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Font Family Selector */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Font Style</label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl">
                    {(["serif", "sans", "mono"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFontFamily(f)}
                        className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all capitalize ${fontFamily === f ? "bg-primary text-white" : "opacity-55 hover:opacity-100"
                          }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col relative">
        {isPdf ? (
          <div className="w-full flex-1 min-h-[90vh] bg-black">
            <iframe
              src={fileUrl}
              className="w-full h-screen border-none"
              title={storedVolume.fileName}
            />
          </div>
        ) : (
          <div className="max-w-3xl w-full mx-auto px-6 py-10 flex-1 flex flex-col justify-between">
            <div ref={viewerRef} className="flex-1 min-h-[75vh]" />
          </div>
        )}
      </main>
    </div>
  );
}
