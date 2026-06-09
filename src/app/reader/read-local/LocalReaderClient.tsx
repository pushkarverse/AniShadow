"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Minus, Plus, Type, X } from "lucide-react";
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
  const [fileUrl, setFileUrl] = useState("");
  const [epubLibLoaded, setEpubLibLoaded] = useState(false);
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);
  const [epubRendition, setEpubRendition] = useState<any>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [fontSize, setFontSize] = useState(100);
  const [theme, setTheme] = useState<"dark" | "sepia" | "light">("dark");
  const [fontFamily, setFontFamily] = useState<"serif" | "sans" | "mono">(
    "serif",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const bookInstanceRef = useRef<any>(null);

  useEffect(() => {
    let objectUrl = "";

    async function loadFile() {
      try {
        const data = await getVolume(id, vol);
        if (data) {
          setStoredVolume(data);
          objectUrl = URL.createObjectURL(data.fileBlob);
          setFileUrl(objectUrl);
        }
      } catch (err) {
        console.error("Failed to load local volume:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFile();

    return () => {
      if (bookInstanceRef.current) {
        try {
          bookInstanceRef.current.destroy();
        } catch {
          // Ignore cleanup failures.
        }
      }

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [id, vol]);

  const isPdf = storedVolume?.fileType?.toLowerCase().includes("pdf") ?? false;

  useEffect(() => {
    if (!epubLibLoaded || !storedVolume || isPdf) return;
    if (
      typeof window === "undefined" ||
      !(window as any).ePub ||
      !viewerRef.current
    )
      return;

    if (bookInstanceRef.current) {
      try {
        bookInstanceRef.current.destroy();
      } catch {
        // Ignore cleanup failures.
      }
    }

    try {
      const book = (window as any).ePub(storedVolume.fileBlob);
      bookInstanceRef.current = book;

      const rendition = book.renderTo(viewerRef.current, {
        width: "100%",
        height: "100%",
        spread: "none",
        flow: "scrolled-doc",
      });

      rendition.display();
      setEpubRendition(rendition);
    } catch (err) {
      console.error("Error rendering EPUB:", err);
    }

    return () => {
      if (bookInstanceRef.current) {
        try {
          bookInstanceRef.current.destroy();
        } catch {
          // Ignore cleanup failures.
        }
        bookInstanceRef.current = null;
      }
    };
  }, [epubLibLoaded, storedVolume, isPdf]);

  useEffect(() => {
    if (epubRendition && !isPdf) {
      applyReaderStyles(epubRendition, theme, fontSize, fontFamily);
    }
  }, [theme, fontSize, fontFamily, epubRendition, isPdf]);

  useEffect(() => {
    if (
      !pdfLibLoaded ||
      !storedVolume ||
      !isPdf ||
      typeof window === "undefined"
    )
      return;

    let cancelled = false;
    const pdfBlob = storedVolume.fileBlob;

    async function loadPdf() {
      try {
        setPdfError(null);
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          throw new Error("PDF library failed to load.");
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

        const pdfData = await pdfBlob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        setPdfDoc(pdf);
        setPdfPageCount(pdf.numPages);
        setPdfPage((current) => {
          if (current < 1) return 1;
          if (current > pdf.numPages) return pdf.numPages;
          return current;
        });
      } catch (err) {
        console.error("Error rendering PDF:", err);
        if (!cancelled) {
          setPdfError("This PDF could not be rendered inside the app.");
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfLibLoaded, storedVolume, isPdf]);

  useEffect(() => {
    if (!pdfDoc || !isPdf || !pdfCanvasRef.current) return;

    let cancelled = false;

    async function renderPdfPage() {
      try {
        const page = await pdfDoc.getPage(pdfPage);
        if (cancelled || !pdfCanvasRef.current) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = viewerRef.current?.clientWidth
          ? Math.max(viewerRef.current.clientWidth - 32, 320)
          : baseViewport.width;
        const scale = containerWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = pdfCanvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas context unavailable.");
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const renderTask = page.render({
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;
      } catch (err) {
        console.error("Failed to render PDF page:", err);
        if (!cancelled) {
          setPdfError("The selected PDF page could not be displayed.");
        }
      }
    }

    renderPdfPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pdfPage, isPdf]);

  const applyReaderStyles = (
    rendition: any,
    currentTheme: string,
    size: number,
    family: string,
  ) => {
    const bg =
      currentTheme === "dark"
        ? "#09090b"
        : currentTheme === "sepia"
          ? "#f4ebd0"
          : "#ffffff";
    const text =
      currentTheme === "dark"
        ? "#e4e4e7"
        : currentTheme === "sepia"
          ? "#4f3824"
          : "#18181b";
    const font =
      family === "serif"
        ? "Georgia, serif"
        : family === "sans"
          ? "system-ui, sans-serif"
          : "monospace";

    rendition.themes.default({
      body: {
        background: `${bg} !important`,
        color: `${text} !important`,
        "font-family": `${font} !important`,
        "font-size": `${size}% !important`,
        "line-height": "1.8 !important",
        padding: "20px 0 !important",
      },
      p: {
        "margin-bottom": "1.5em !important",
        "text-indent": "1.5em !important",
      },
      "p:first-of-type": {
        "text-indent": "0 !important",
      },
      h1: { "font-family": `${font} !important`, color: `${text} !important` },
      h2: { "font-family": `${font} !important`, color: `${text} !important` },
      h3: { "font-family": `${font} !important`, color: `${text} !important` },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/40 text-xs font-black uppercase tracking-widest">
            Loading stored file...
          </p>
        </div>
      </div>
    );
  }

  if (!storedVolume) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-3xl font-black text-primary uppercase italic mb-4 tracking-tighter">
          File Not Found
        </h1>
        <p className="text-white/40 text-sm max-w-sm mb-8">
          No uploaded file was found for this volume in your browser's local
          library.
        </p>
        <Link
          href={`/reader/${id}/${slug}`}
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
        >
          Go Back
        </Link>
      </div>
    );
  }

  const titleText = `${slug.replace(/-/g, " ")} - Volume ${vol}`;

  return (
    <div
      className={`min-h-screen ${theme === "dark" ? "bg-[#09090b]" : theme === "sepia" ? "bg-[#f4ebd0]" : "bg-white"} flex flex-col`}
    >
      {!isPdf && (
        <Script
          src="https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js"
          strategy="lazyOnload"
          onLoad={() => setEpubLibLoaded(true)}
        />
      )}

      {isPdf && (
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"
          strategy="lazyOnload"
          onLoad={() => setPdfLibLoaded(true)}
        />
      )}

      <header
        className={`px-6 py-4 flex items-center justify-between border-b ${
          theme === "dark"
            ? "bg-black/80 border-white/5 text-white"
            : theme === "sepia"
              ? "bg-[#e5d8b6]/80 border-[#8b7355]/20 text-[#4f3824]"
              : "bg-white/80 border-black/5 text-black"
        } backdrop-blur-xl sticky top-0 z-50`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href={`/reader/${id}/${slug}`}
            className="p-2 hover:bg-white/5 rounded-full transition-colors shrink-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xs font-black uppercase tracking-widest truncate">
              {titleText}
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mt-0.5">
              Local {isPdf ? "PDF Reader" : "EPUB Reader"}
              {isPdf && pdfPageCount > 0
                ? ` · Page ${pdfPage} / ${pdfPageCount}`
                : ""}
            </p>
          </div>
        </div>

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

      <AnimatePresence>
        {settingsOpen && !isPdf && (
          <>
            <div
              onClick={() => setSettingsOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-75 border-l p-6 shadow-2xl flex flex-col justify-between ${
                theme === "dark"
                  ? "bg-[#0c0c0e] border-white/5 text-white"
                  : theme === "sepia"
                    ? "bg-[#e5d8b6] border-[#8b7355]/20 text-[#4f3824]"
                    : "bg-white border-black/5 text-black"
              }`}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                  <span className="text-xs font-black uppercase tracking-widest">
                    Reader Settings
                  </span>
                  <button
                    onClick={() => setSettingsOpen(false)}
                    className="p-1 hover:bg-white/5 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40">
                    Background
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl">
                    {(["dark", "sepia", "light"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all capitalize ${
                          theme === t
                            ? "bg-primary text-white"
                            : "opacity-55 hover:opacity-100"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40">
                    Font Size
                  </label>
                  <div className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-xl">
                    <button
                      onClick={() => setFontSize(Math.max(60, fontSize - 10))}
                      className="p-1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black">{fontSize}%</span>
                    <button
                      onClick={() => setFontSize(Math.min(200, fontSize + 10))}
                      className="p-1"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40">
                    Font Style
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl">
                    {(["serif", "sans", "mono"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFontFamily(f)}
                        className={`py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all capitalize ${
                          fontFamily === f
                            ? "bg-primary text-white"
                            : "opacity-55 hover:opacity-100"
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

      <main ref={viewerRef} className="flex-1 w-full flex flex-col relative">
        {isPdf ? (
          <div className="flex-1 min-h-[90vh] bg-[#111] px-4 py-6 md:px-8 md:py-8 overflow-auto">
            {pdfError ? (
              <div className="max-w-2xl mx-auto rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-center text-white space-y-4">
                <h2 className="text-xl font-black uppercase tracking-widest text-red-300">
                  PDF Viewer Error
                </h2>
                <p className="text-sm text-white/70">{pdfError}</p>
                {fileUrl && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-5 py-3 bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Open PDF in New Tab
                  </a>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <button
                    onClick={() => setPdfPage((page) => Math.max(1, page - 1))}
                    disabled={pdfPage <= 1}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white text-xs font-black uppercase tracking-widest border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-black uppercase tracking-widest text-white/60">
                    {pdfPageCount > 0
                      ? `Page ${pdfPage} of ${pdfPageCount}`
                      : "Loading pages..."}
                  </span>
                  <button
                    onClick={() =>
                      setPdfPage((page) => Math.min(pdfPageCount, page + 1))
                    }
                    disabled={pdfPageCount === 0 || pdfPage >= pdfPageCount}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white text-xs font-black uppercase tracking-widest border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
                  >
                    Next
                  </button>
                </div>

                <div className="flex justify-center">
                  <canvas
                    ref={pdfCanvasRef}
                    className="max-w-full h-auto rounded-2xl shadow-2xl bg-white"
                  />
                </div>
              </>
            )}
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
