"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Minus,
  MousePointer2,
  Scaling,
  ArrowLeft,
  ArrowRight,
  Maximize,
  Menu,
  Image as ImageIcon,
  List as ListIcon,
  RotateCw,
  ChevronLeft,
} from "lucide-react";
import { PdfPage } from "./PdfPage";

interface PdfReaderProps {
  pdfDoc: any;
  isMobile: boolean;
  pdfControlsVisible: boolean;
  onToggleControls: () => void;
  documentTitle?: string;
  backHref?: string;
}

type PdfReadingMode = "scroll" | "flip";

const MIN_ZOOM = 25;
const MAX_ZOOM = 500;
const DEFAULT_ZOOM = 100;
const ZOOM_STEP = 10;

interface OutlineItem {
  title: string;
  dest?: unknown;
  items?: OutlineItem[];
}

async function resolveDestToPage(
  pdfDoc: any,
  dest: unknown,
): Promise<number | null> {
  try {
    let destination = dest;
    if (typeof destination === "string") {
      destination = await pdfDoc.getDestination(destination);
    }
    if (!destination || !Array.isArray(destination)) return null;
    const pageIndex = await pdfDoc.getPageIndex(destination[0]);
    return pageIndex + 1;
  } catch {
    return null;
  }
}

function OutlineTree({
  items,
  pdfDoc,
  onNavigate,
  depth = 0,
}: {
  items: OutlineItem[];
  pdfDoc: any;
  onNavigate: (page: number) => void;
  depth?: number;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item, i) => (
        <li key={`${depth}-${i}-${item.title}`}>
          <button
            type="button"
            onClick={async () => {
              if (!item.dest) return;
              const page = await resolveDestToPage(pdfDoc, item.dest);
              if (page) onNavigate(page);
            }}
            className="w-full text-left text-sm text-white/70 hover:text-white hover:bg-primary/10 rounded-md px-2 py-1.5 transition-colors truncate"
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            {item.title}
          </button>
          {item.items && item.items.length > 0 && (
            <OutlineTree
              items={item.items}
              pdfDoc={pdfDoc}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-white/10 shrink-0" />;
}

export function PdfReader({
  pdfDoc,
  isMobile,
  pdfControlsVisible,
  onToggleControls,
  documentTitle = "Document",
  backHref = "/reader",
}: PdfReaderProps) {
  const [pdfPage, setPdfPage] = useState(1);
  const pdfPageCount = pdfDoc.numPages;
  const [zoomPercent, setZoomPercent] = useState(DEFAULT_ZOOM);
  const [contentWidth, setContentWidth] = useState(800);
  const [pdfReadingMode, setPdfReadingMode] =
    useState<PdfReadingMode>("scroll");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"thumbs" | "outline">("thumbs");
  const [pdfOutline, setPdfOutline] = useState<OutlineItem[]>([]);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pageRotation, setPageRotation] = useState(0);

  const [pdfPageInput, setPdfPageInput] = useState(String(pdfPage));

  const pdfScrollRef = useRef<HTMLDivElement>(null);
  const pdfPageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const thumbRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pinchRef = useRef({ distance: 0, zoom: DEFAULT_ZOOM });
  const isScrollingRef = useRef(false);

  const zoomScale = zoomPercent / 100;
  const pageViewportWidth = isMobile
    ? typeof window !== "undefined"
      ? window.innerWidth - 16
      : 360
    : Math.max(contentWidth - 48, 200);

  useEffect(() => {
    if (!pdfDoc) return;
    async function loadExtraData() {
      try {
        const outline = await pdfDoc.getOutline();
        setPdfOutline(outline || []);
      } catch (e) {
        console.error("Failed to load outline:", e);
      }
    }
    loadExtraData();
  }, [pdfDoc]);

  useEffect(() => {
    setPdfPageInput(String(pdfPage));
  }, [pdfPage]);

  useEffect(() => {
    const el = pdfScrollRef.current;
    if (!el) return;

    const updateWidth = () => {
      setContentWidth(el.clientWidth);
    };
    updateWidth();

    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile, sidebarOpen, pdfReadingMode]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(pdfPageInput);
    if (!isNaN(val)) {
      goToPage(val);
    } else {
      setPdfPageInput(String(pdfPage));
    }
  };

  useEffect(() => {
    if (pdfReadingMode !== "scroll" || !pdfPageCount || !pdfScrollRef.current)
      return;

    const container = pdfScrollRef.current;
    let ticking = false;

    const syncPageFromScroll = () => {
      const scrollTop = container.scrollTop;
      let bestPage = 1;
      let bestDist = Infinity;

      pdfPageRefs.current.forEach((el, idx) => {
        if (!el) return;
        const dist = Math.abs(el.offsetTop - scrollTop);
        if (dist < bestDist) {
          bestDist = dist;
          bestPage = idx + 1;
        }
      });

      setPdfPage(bestPage);
      thumbRefs.current[bestPage - 1]?.scrollIntoView({
        behavior: "auto",
        block: "nearest",
      });
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          syncPageFromScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [pdfPageCount, pdfReadingMode, zoomPercent, contentWidth]);

  const updateZoomPercent = useCallback((val: number) => {
    setZoomPercent(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(val))));
  }, []);

  const resetZoom = useCallback(() => {
    updateZoomPercent(DEFAULT_ZOOM);
  }, [updateZoomPercent]);

  const goToPage = useCallback(
    (num: number) => {
      const clamped = Math.max(1, Math.min(pdfPageCount, num));
      setPdfPage(clamped);

      if (pdfReadingMode === "scroll") {
        isScrollingRef.current = true;
        pdfPageRefs.current[clamped - 1]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        window.setTimeout(() => {
          isScrollingRef.current = false;
        }, 500);
      }

      thumbRefs.current[clamped - 1]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    },
    [pdfPageCount, pdfReadingMode],
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        distance: Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        ),
        zoom: zoomPercent,
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
      const ratio = dist / pinchRef.current.distance;
      updateZoomPercent(pinchRef.current.zoom * ratio);
    }
  };

  useEffect(() => {
    const container = pdfScrollRef.current;
    if (!container || isMobile) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoomPercent((prev) =>
          Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)),
        );
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [isMobile]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToPage(pdfPage + 1);
      if (e.key === "ArrowLeft") goToPage(pdfPage - 1);
      if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        updateZoomPercent(zoomPercent + ZOOM_STEP);
      }
      if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        updateZoomPercent(zoomPercent - ZOOM_STEP);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pdfPage, zoomPercent, goToPage, updateZoomPercent]);

  const openSidebarTab = (tab: "thumbs" | "outline") => {
    if (sidebarOpen && sidebarTab === tab) {
      setSidebarOpen(false);
    } else {
      setSidebarTab(tab);
      setSidebarOpen(true);
    }
  };

  const pageContent = (
    <div
      className={`min-h-full flex flex-col items-center ${pdfReadingMode === "scroll" ? "py-4 gap-6" : "min-h-full justify-center p-4"}`}
    >
      {pdfReadingMode === "scroll" ? (
        Array.from({ length: pdfPageCount }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              pdfPageRefs.current[i] = el;
            }}
            data-page-number={i + 1}
            className={`w-full flex flex-col items-center shrink-0 ${!isMobile ? "snap-start snap-always" : ""}`}
            style={{ transform: `rotate(${pageRotation}deg)` }}
          >
            {!isMobile && (
              <span
                className={`mb-2 text-sm tabular-nums ${pdfPage === i + 1 ? "text-white/80" : "text-white/30"}`}
              >
                {i + 1}
              </span>
            )}
            <PdfPage
              pdfDoc={pdfDoc}
              pageNumber={i + 1}
              viewportWidth={pageViewportWidth}
              active={Math.abs(i + 1 - pdfPage) <= 6}
              zoomScale={zoomScale}
              onError={setPdfError}
            />
          </div>
        ))
      ) : (
        <div
          className="relative group flex flex-col items-center"
          style={{ transform: `rotate(${pageRotation}deg)` }}
        >
          <PdfPage
            pdfDoc={pdfDoc}
            pageNumber={pdfPage}
            viewportWidth={pageViewportWidth}
            active={true}
            zoomScale={zoomScale}
            onError={setPdfError}
          />

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
  );

  if (!isMobile) {
    return (
      <div className="flex flex-col flex-1 h-screen overflow-hidden bg-[#08020c]">
        {/* Top toolbar */}
        <div className="h-12 shrink-0 border-b border-primary/15 bg-[#0c0410] flex items-center px-3 gap-2 z-50">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            title="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link
            href={backHref}
            className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
            title="Back to library"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <span className="text-sm text-white/90 truncate max-w-[280px] lg:max-w-[420px]">
            {documentTitle}
          </span>

          <div className="flex-1" />

          <div className="flex items-center gap-1.5">
            <form
              onSubmit={handlePageInputSubmit}
              className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-md px-2 py-1"
            >
              <input
                type="text"
                value={pdfPageInput}
                onChange={(e) => setPdfPageInput(e.target.value)}
                className="w-8 bg-transparent text-center text-sm text-white outline-none"
              />
              <span className="text-sm text-white/40">/</span>
              <span className="text-sm text-white/60 pr-1">{pdfPageCount}</span>
            </form>

            <ToolbarDivider />

            <button
              type="button"
              onClick={() => updateZoomPercent(zoomPercent - ZOOM_STEP)}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              title="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm text-white/70 w-10 text-center tabular-nums">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={() => updateZoomPercent(zoomPercent + ZOOM_STEP)}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              title="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>

            <ToolbarDivider />

            <button
              type="button"
              onClick={resetZoom}
              className={`p-2 rounded-lg transition-colors ${zoomPercent === DEFAULT_ZOOM ? "text-primary bg-primary/15" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              title="Fit to screen (100%)"
            >
              <Maximize className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPageRotation((r) => (r + 90) % 360)}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <ToolbarDivider />

            <button
              type="button"
              onClick={() => setPdfReadingMode("scroll")}
              className={`p-2 rounded-lg transition-colors ${pdfReadingMode === "scroll" ? "text-primary bg-primary/15" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              title="Scroll mode"
            >
              <MousePointer2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPdfReadingMode("flip")}
              className={`p-2 rounded-lg transition-colors ${pdfReadingMode === "flip" ? "text-primary bg-primary/15" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              title="Flip mode"
            >
              <Scaling className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body: icon strip + sidebar + viewport */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-12 shrink-0 border-r border-primary/10 bg-[#0a030e] flex flex-col items-center py-3 gap-1 z-40">
            <button
              type="button"
              onClick={() => openSidebarTab("thumbs")}
              className={`p-2.5 rounded-xl transition-all ${sidebarOpen && sidebarTab === "thumbs" ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-white/35 hover:text-white hover:bg-white/5"}`}
              title="Thumbnails"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => openSidebarTab("outline")}
              className={`p-2.5 rounded-xl transition-all ${sidebarOpen && sidebarTab === "outline" ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-white/35 hover:text-white hover:bg-white/5"}`}
              title="Table of contents"
            >
              <ListIcon className="w-5 h-5" />
            </button>
          </div>

          {sidebarOpen && (
            <div className="w-52 shrink-0 border-r border-primary/10 bg-[#0c0410] flex flex-col z-30 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
                  {sidebarTab === "thumbs" ? "Pages" : "Contents"}
                </span>
              </div>

              {sidebarTab === "thumbs" ? (
                <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
                  {Array.from({ length: pdfPageCount }).map((_, i) => (
                    <div
                      key={`thumb-${i}`}
                      ref={(el) => {
                        thumbRefs.current[i] = el;
                      }}
                      onClick={() => goToPage(i + 1)}
                      className={`group relative cursor-pointer transition-all duration-200 ${pdfPage === i + 1 ? "ring-2 ring-primary ring-offset-2 ring-offset-[#0c0410]" : "opacity-50 hover:opacity-100"}`}
                    >
                      <div className="aspect-[1/1.41] bg-white/5 rounded border border-white/5 overflow-hidden">
                        <PdfPage
                          pdfDoc={pdfDoc}
                          pageNumber={i + 1}
                          viewportWidth={160}
                          active={true}
                          zoomScale={1}
                          onError={() => {}}
                        />
                      </div>
                      <div
                        className={`mt-1.5 text-center text-[10px] font-bold tabular-nums ${pdfPage === i + 1 ? "text-primary" : "text-white/30 group-hover:text-white/50"}`}
                      >
                        {i + 1}
                      </div>
                    </div>
                  ))}
                  <div className="h-2" />
                </div>
              ) : pdfOutline.length > 0 ? (
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                  <OutlineTree
                    items={pdfOutline}
                    pdfDoc={pdfDoc}
                    onNavigate={goToPage}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <p className="text-xs text-white/30 text-center">
                    No table of contents in this PDF
                  </p>
                </div>
              )}
            </div>
          )}

          <div
            ref={pdfScrollRef}
            className="flex-1 overflow-y-auto overscroll-contain scroll-smooth bg-[#08020c] custom-scrollbar snap-y snap-mandatory"
          >
            {pageContent}
          </div>
        </div>

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

  /* Mobile layout — unchanged */
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#08020c]">
      <div
        ref={pdfScrollRef}
        className="flex-1 overflow-auto relative overscroll-contain scroll-smooth bg-[#08020c] scrollbar-hide touch-pan-y"
        onClick={onToggleControls}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {pageContent}
      </div>

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
                onClick={() => updateZoomPercent(zoomPercent - ZOOM_STEP)}
                className="p-1"
              >
                <Minus className="w-4 h-4 text-primary" />
              </button>
              <span className="mx-4 text-[10px] font-black text-white/80">
                {zoomPercent}%
              </span>
              <button
                onClick={() => updateZoomPercent(zoomPercent + ZOOM_STEP)}
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
