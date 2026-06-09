"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Minus,
  MousePointer2,
  Scaling,
  ArrowLeft,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize,
} from "lucide-react";
import { PdfPage } from "./PdfPage";

interface PdfReaderProps {
  pdfDoc: any;
  isMobile: boolean;
  pdfControlsVisible: boolean;
  onToggleControls: () => void;
}

type PdfReadingMode = "scroll" | "flip";

export function PdfReader({
  pdfDoc,
  isMobile,
  pdfControlsVisible,
  onToggleControls,
}: PdfReaderProps) {
  const [pdfPage, setPdfPage] = useState(1);
  const pdfPageCount = pdfDoc.numPages;
  const [pdfZoom, setPdfZoom] = useState(1);
  const [pdfReadingMode, setPdfReadingMode] =
    useState<PdfReadingMode>("scroll");
  const [showThumbnails, setShowThumbnails] = useState(!isMobile);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [pdfPageInput, setPdfPageInput] = useState(String(pdfPage));

  const pdfScrollRef = useRef<HTMLDivElement>(null);
  const pdfPageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const thumbRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pinchRef = useRef({ distance: 0, zoom: 1 });

  const pdfZoomPercent = Math.round(pdfZoom * 100);

  // Sync input with page changes
  useEffect(() => {
    setPdfPageInput(String(pdfPage));
  }, [pdfPage]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(pdfPageInput);
    if (!isNaN(val)) {
      goToPage(val);
    } else {
      setPdfPageInput(String(pdfPage));
    }
  };

  // Scroll Progress Detection
  useEffect(() => {
    if (pdfReadingMode !== "scroll" || !pdfPageCount || !pdfScrollRef.current)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const page = Number(
            (visible.target as HTMLElement).dataset.pageNumber,
          );
          if (!isNaN(page)) {
            // Use a slight timeout to prevent state spamming
            requestAnimationFrame(() => setPdfPage(page));
          }
        }
      },
      { root: pdfScrollRef.current, threshold: [0.1, 0.4] },
    );
    pdfPageRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pdfPageCount, pdfReadingMode]);

  const updateZoom = useCallback((val: number) => {
    setPdfZoom(Math.max(0.5, Math.min(3, Number(val.toFixed(2)))));
  }, []);

  const goToPage = useCallback(
    (num: number) => {
      const clamped = Math.max(1, Math.min(pdfPageCount, num));
      if (pdfReadingMode === "scroll") {
        pdfPageRefs.current[clamped - 1]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else {
        setPdfPage(clamped);
      }

      // Sync thumbnail visibility
      thumbRefs.current[clamped - 1]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    },
    [pdfPageCount, pdfReadingMode],
  );

  // Gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        distance: Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        ),
        zoom: pdfZoom,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      updateZoom(pinchRef.current.zoom * (dist / pinchRef.current.distance));
    }
  };

  // Keyboard Support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToPage(pdfPage + 1);
      if (e.key === "ArrowLeft") goToPage(pdfPage - 1);
      if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        updateZoom(pdfZoom + 0.1);
      }
      if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        updateZoom(pdfZoom - 0.1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pdfPage, pdfZoom, goToPage, updateZoom]);

  return (
    <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden bg-[#08020c]">
      {/* Adobe Style Left Navigation Bar */}
      {!isMobile && (
        <div className="w-16 border-r border-primary/10 bg-[#0c0410]/95 backdrop-blur-md flex flex-col items-center py-6 gap-6 z-50">
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-3 rounded-xl transition-all ${showThumbnails ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/30 hover:bg-white/5 hover:text-white"}`}
            title="Toggle Thumbnails"
          >
            {showThumbnails ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeftOpen className="w-5 h-5" />
            )}
          </button>

          <div className="w-8 h-px bg-white/5" />

          <div className="flex flex-col rounded-2xl bg-black/40 border border-white/5 overflow-hidden shadow-2xl">
            <button
              onClick={() => updateZoom(pdfZoom + 0.15)}
              className="p-4 text-primary hover:bg-primary/20 transition-all border-b border-white/5"
            >
              <Plus className="w-5 h-5" />
            </button>
            <form
              onSubmit={handlePageInputSubmit}
              className="border-b border-white/5 bg-primary/5"
            >
              <input
                type="text"
                value={pdfPageInput}
                onChange={(e) => setPdfPageInput(e.target.value)}
                className="w-full py-2 bg-transparent text-center text-[10px] font-black text-primary outline-none"
              />
            </form>
            <button
              onClick={() => updateZoom(pdfZoom - 0.15)}
              className="p-4 text-primary hover:bg-primary/20 transition-all"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col rounded-2xl bg-black/40 border border-white/5 overflow-hidden shadow-2xl">
            <button
              onClick={() => updateZoom(1)}
              className={`p-4 transition-all ${pdfZoom === 1 ? "text-primary bg-primary/10" : "text-white/30 hover:text-white"}`}
              title="Fit to Width"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col rounded-2xl bg-black/40 border border-white/5 overflow-hidden shadow-2xl mt-auto mb-4">
            {(["scroll", "flip"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPdfReadingMode(m)}
                className={`p-4 transition-all ${pdfReadingMode === m ? "bg-primary text-white shadow-lg" : "text-white/30 hover:text-white"} ${m === "scroll" ? "border-b border-white/5" : ""}`}
                title={`${m.toUpperCase()} Mode`}
              >
                {m === "scroll" ? (
                  <MousePointer2 className="w-5 h-5" />
                ) : (
                  <Scaling className="w-5 h-5" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Thumbnail Sidebar (Adobe Style) */}
      {!isMobile && showThumbnails && (
        <div className="w-64 border-r border-primary/5 bg-[#0c0410]/40 backdrop-blur-xl flex flex-col z-40 overflow-hidden animate-in slide-in-from-left duration-300">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              Thumbnails
            </span>
            <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {pdfPageCount} Pages
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-primary/20">
            {Array.from({ length: pdfPageCount }).map((_, i) => (
              <div
                key={`thumb-${i}`}
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                onClick={() => goToPage(i + 1)}
                className={`group relative cursor-pointer transition-all duration-300 ${pdfPage === i + 1 ? "ring-2 ring-primary ring-offset-4 ring-offset-[#08020c] opacity-100 scale-100" : "opacity-40 hover:opacity-100 hover:scale-[1.02]"}`}
              >
                <div className="aspect-[1/1.41] bg-white/5 rounded-lg overflow-hidden shadow-xl border border-white/5 group-hover:border-primary/30">
                  <PdfPage
                    pdfDoc={pdfDoc}
                    pageNumber={i + 1}
                    viewportWidth={200}
                    active={Math.abs(i + 1 - pdfPage) <= 5}
                    baseScale={0.3}
                    onError={() => {}}
                  />
                </div>
                <div
                  className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest ${pdfPage === i + 1 ? "text-primary" : "text-white/20 group-hover:text-white/40"}`}
                >
                  {i + 1}
                </div>
              </div>
            ))}
            <div className="h-4" /> {/* Spacer */}
          </div>
        </div>
      )}

      <div
        ref={pdfScrollRef}
        className="flex-1 overflow-auto relative overscroll-none scroll-smooth bg-[#08020c] scrollbar-hide"
        onClick={onToggleControls}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div
          className={`min-h-full p-4 md:p-12 flex flex-col items-center transition-transform duration-300 ease-out origin-top will-change-transform`}
          style={{
            transform: `scale(${pdfZoom})`,
            gap: pdfReadingMode === "scroll" ? "3rem" : "0",
          }}
        >
          {pdfReadingMode === "scroll" ? (
            Array.from({ length: pdfPageCount }).map((_, i) => (
              <div
                key={i}
                ref={(el) => {
                  pdfPageRefs.current[i] = el;
                }}
                data-page-number={i + 1}
                className="w-full max-w-212.5"
              >
                <PdfPage
                  pdfDoc={pdfDoc}
                  pageNumber={i + 1}
                  viewportWidth={isMobile ? 800 : 900}
                  active={Math.abs(i + 1 - pdfPage) <= 3}
                  baseScale={1.5}
                  onError={setPdfError}
                />
              </div>
            ))
          ) : (
            <div className="relative group w-full max-w-212.5 aspect-[1/1.41] shadow-2xl">
              <PdfPage
                pdfDoc={pdfDoc}
                pageNumber={pdfPage}
                viewportWidth={isMobile ? 800 : 900}
                active={true}
                baseScale={1.8}
                onError={setPdfError}
              />

              {/* Big Desktop Side Arrows */}
              {!isMobile && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPage(pdfPage - 1);
                    }}
                    className="absolute -left-20 top-1/2 -translate-y-1/2 p-4 bg-primary/10 border border-primary/20 rounded-full text-primary hover:bg-primary/30 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
                    disabled={pdfPage <= 1}
                  >
                    <ArrowLeft className="w-8 h-8" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPage(pdfPage + 1);
                    }}
                    className="absolute -right-20 top-1/2 -translate-y-1/2 p-4 bg-primary/10 border border-primary/20 rounded-full text-primary hover:bg-primary/30 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
                    disabled={pdfPage >= pdfPageCount}
                  >
                    <ArrowRight className="w-8 h-8" />
                  </button>
                </>
              )}

              {/* Mobile Edge Tap Regions */}
              {isMobile && (
                <div className="absolute inset-0 flex pointer-events-none">
                  <div
                    className="w-[15%] h-full pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPage(pdfPage - 1);
                    }}
                  />
                  <div
                    className="flex-1 h-full pointer-events-auto"
                    onClick={onToggleControls}
                  />
                  <div
                    className="w-[15%] h-full pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPage(pdfPage + 1);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Control Bar - Floating Pill */}
      {isMobile && (
        <div
          className={`fixed bottom-8 left-4 right-4 z-100 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${pdfControlsVisible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"}`}
        >
          <div className="bg-[#120418]/95 border border-primary/30 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 flex bg-black/60 rounded-2xl border border-white/5 overflow-hidden">
                <button
                  onClick={() => goToPage(pdfPage - 1)}
                  className="flex-1 py-4 text-[10px] font-black tracking-widest text-primary active:bg-primary/20"
                >
                  PREV
                </button>
                <form
                  onSubmit={handlePageInputSubmit}
                  className="flex-1 border-l border-white/5 bg-primary/10"
                >
                  <input
                    type="text"
                    value={pdfPageInput}
                    onChange={(e) => setPdfPageInput(e.target.value)}
                    className="w-full h-full bg-transparent text-center text-xs font-black text-primary outline-none"
                  />
                </form>
                <button
                  onClick={() => goToPage(pdfPage + 1)}
                  className="flex-1 py-4 text-[10px] font-black tracking-widest text-primary active:bg-primary/20 border-l border-white/5"
                >
                  NEXT
                </button>
              </div>
              <div className="flex items-center bg-black/60 rounded-2xl border border-white/5 px-4 py-4">
                <button
                  onClick={() => updateZoom(pdfZoom - 0.2)}
                  className="p-1"
                >
                  <Minus className="w-4 h-4 text-primary" />
                </button>
                <span className="mx-4 text-[10px] font-black text-white/80">
                  {pdfZoomPercent}%
                </span>
                <button
                  onClick={() => updateZoom(pdfZoom + 0.2)}
                  className="p-1"
                >
                  <Plus className="w-4 h-4 text-primary" />
                </button>
              </div>
            </div>
            <div className="flex bg-black/60 rounded-2xl border border-white/5 p-1">
              {(["scroll", "flip"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPdfReadingMode(m)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${pdfReadingMode === m ? "bg-primary text-white shadow-lg" : "text-white/40"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {pdfError && (
        <div className="fixed inset-0 z-200 bg-black/80 flex items-center justify-center p-6 text-center">
          <div className="bg-[#120418] border border-red-500/20 p-8 rounded-3xl max-w-sm">
            <p className="text-white/80 text-sm font-bold">{pdfError}</p>
            <button
              onClick={() => setPdfError(null)}
              className="mt-6 px-6 py-2 bg-primary rounded-xl text-xs font-black"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
