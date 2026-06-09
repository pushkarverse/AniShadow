"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Minus, Plus, Type, X } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { AnimatePresence, motion } from "framer-motion";
import { getVolume, StoredVolume } from "@/lib/indexedDb";

interface LocalReaderClientProps {
  id: string;
  slug: string;
  vol: number;
}

type PdfReadingMode = "scroll" | "flip";
type PdfFlipDirection = "next" | "prev";

interface PendingPdfTurn {
  image: string;
  direction: PdfFlipDirection;
  targetPage: number;
}

interface ActivePdfTurn extends PendingPdfTurn {
  key: number;
}

interface ActivePdfDrag extends PendingPdfTurn {
  progress: number;
  startX: number;
}

interface PdfPageCanvasProps {
  pdfDoc: any;
  pageNumber: number;
  zoom: number;
  viewportWidth: number;
  onError: (message: string) => void;
}

function PdfPageCanvas({
  pdfDoc,
  pageNumber,
  zoom,
  viewportWidth,
  onError,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || typeof window === "undefined") return;

    let cancelled = false;
    let renderTask: { cancel?: () => void; promise?: Promise<void> } | null =
      null;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });

        if (!context) {
          throw new Error("Canvas context unavailable.");
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = viewportWidth
          ? Math.max(viewportWidth - 64, 320)
          : baseViewport.width;
        const fitWidthScale = availableWidth / baseViewport.width;
        const finalScale = fitWidthScale * zoom;
        const viewport = page.getViewport({ scale: finalScale });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, viewport.width, viewport.height);

        const currentRenderTask = page.render({
          canvasContext: context,
          viewport,
        });
        renderTask = currentRenderTask;

        await currentRenderTask.promise;
      } catch (err) {
        if (
          (err as { name?: string })?.name === "RenderingCancelledException"
        ) {
          return;
        }

        console.error(`Failed to render PDF page ${pageNumber}:`, err);
        if (!cancelled) {
          onError(`Page ${pageNumber} could not be displayed.`);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [onError, pageNumber, pdfDoc, viewportWidth, zoom]);

  return <canvas ref={canvasRef} className="block bg-white" />;
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
  const [pdfPageInput, setPdfPageInput] = useState("1");
  const [pdfZoom, setPdfZoom] = useState(1);
  const [pdfViewportWidth, setPdfViewportWidth] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfReadingMode, setPdfReadingMode] =
    useState<PdfReadingMode>("scroll");
  const [pdfTurnOverlay, setPdfTurnOverlay] = useState<ActivePdfTurn | null>(
    null,
  );
  const [pdfDragOverlay, setPdfDragOverlay] = useState<ActivePdfDrag | null>(
    null,
  );

  const [fontSize, setFontSize] = useState(100);
  const [theme, setTheme] = useState<"dark" | "sepia" | "light">("dark");
  const [fontFamily, setFontFamily] = useState<"serif" | "sans" | "mono">(
    "serif",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const epubViewerRef = useRef<HTMLDivElement>(null);
  const pdfScrollContainerRef = useRef<HTMLDivElement>(null);
  const pdfFlipStageRef = useRef<HTMLDivElement>(null);
  const pdfFlipCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfPageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pendingPdfTurnRef = useRef<PendingPdfTurn | null>(null);
  const bookInstanceRef = useRef<any>(null);

  const isPdf = storedVolume?.fileType?.toLowerCase().includes("pdf") ?? false;

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

  useEffect(() => {
    if (!epubLibLoaded || !storedVolume || isPdf) return;
    if (
      typeof window === "undefined" ||
      !(window as any).ePub ||
      !epubViewerRef.current
    ) {
      return;
    }

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

      const rendition = book.renderTo(epubViewerRef.current, {
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
  }, [epubLibLoaded, isPdf, storedVolume]);

  useEffect(() => {
    if (epubRendition && !isPdf) {
      applyReaderStyles(epubRendition, theme, fontSize, fontFamily);
    }
  }, [epubRendition, fontFamily, fontSize, isPdf, theme]);

  useEffect(() => {
    if (
      !pdfLibLoaded ||
      !storedVolume ||
      !isPdf ||
      typeof window === "undefined"
    ) {
      return;
    }

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

        pendingPdfTurnRef.current = null;
        setPdfTurnOverlay(null);
        setPdfDragOverlay(null);
        setPdfDoc(pdf);
        setPdfPageCount(pdf.numPages);
        setPdfPage(1);
        setPdfPageInput("1");
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
  }, [isPdf, pdfLibLoaded, storedVolume]);

  useEffect(() => {
    if (
      !isPdf ||
      !pdfScrollContainerRef.current ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }

    const element = pdfScrollContainerRef.current;
    const updateWidth = () => {
      setPdfViewportWidth(element.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isPdf]);

  useEffect(() => {
    if (
      !isPdf ||
      pdfReadingMode !== "scroll" ||
      !pdfPageCount ||
      !pdfScrollContainerRef.current
    ) {
      return;
    }

    const container = pdfScrollContainerRef.current;
    const pageElements = pdfPageRefs.current.filter(
      Boolean,
    ) as HTMLDivElement[];
    if (!pageElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const mostVisible = visibleEntries[0];
        if (!mostVisible) return;

        const pageNumber = Number(
          (mostVisible.target as HTMLDivElement).dataset.pageNumber,
        );

        if (!Number.isNaN(pageNumber)) {
          setPdfPage(pageNumber);
          setPdfPageInput(String(pageNumber));
        }
      },
      {
        root: container,
        threshold: [0.25, 0.5, 0.75],
      },
    );

    for (const element of pageElements) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [isPdf, pdfPageCount, pdfReadingMode, pdfZoom]);

  const updatePdfZoom = useCallback((nextZoom: number) => {
    setPdfZoom(Math.max(0.5, Math.min(2.5, Number(nextZoom.toFixed(2)))));
  }, []);

  const scrollToPdfPage = useCallback(
    (nextPage: number) => {
      if (!pdfPageCount) return;

      const clampedPage = Math.max(1, Math.min(pdfPageCount, nextPage));
      const element = pdfPageRefs.current[clampedPage - 1];
      if (!element) return;

      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      setPdfPage(clampedPage);
      setPdfPageInput(String(clampedPage));
    },
    [pdfPageCount],
  );

  const changeFlipPdfPage = useCallback(
    (nextPage: number) => {
      if (!pdfPageCount) return;

      const clampedPage = Math.max(1, Math.min(pdfPageCount, nextPage));
      if (clampedPage === pdfPage) return;

      const canvas = pdfFlipCanvasRef.current;
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        pendingPdfTurnRef.current = {
          image: canvas.toDataURL("image/png"),
          direction: clampedPage > pdfPage ? "next" : "prev",
          targetPage: clampedPage,
        };
      } else {
        pendingPdfTurnRef.current = null;
      }

      setPdfPage(clampedPage);
      setPdfPageInput(String(clampedPage));
    },
    [pdfPage, pdfPageCount],
  );

  const startManualPdfFlip = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pdfReadingMode !== "flip" || !pdfPageCount || pdfTurnOverlay) return;

      const stage = pdfFlipStageRef.current;
      const canvas = pdfFlipCanvasRef.current;
      if (!stage || !canvas || canvas.width === 0 || canvas.height === 0)
        return;

      const rect = stage.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const edgeSize = Math.max(56, rect.width * 0.18);

      let direction: PdfFlipDirection | null = null;
      let targetPage = pdfPage;

      if (pointerX >= rect.width - edgeSize && pdfPage < pdfPageCount) {
        direction = "next";
        targetPage = pdfPage + 1;
      } else if (pointerX <= edgeSize && pdfPage > 1) {
        direction = "prev";
        targetPage = pdfPage - 1;
      }

      if (!direction) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();

      pendingPdfTurnRef.current = null;
      setPdfTurnOverlay(null);
      setPdfDragOverlay({
        image: canvas.toDataURL("image/png"),
        direction,
        targetPage,
        progress: 0,
        startX: event.clientX,
      });
    },
    [pdfPage, pdfPageCount, pdfReadingMode, pdfTurnOverlay],
  );

  const moveManualPdfFlip = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      setPdfDragOverlay((current) => {
        if (!current || !pdfFlipStageRef.current) return current;

        const rect = pdfFlipStageRef.current.getBoundingClientRect();
        const dragDistance =
          current.direction === "next"
            ? current.startX - event.clientX
            : event.clientX - current.startX;
        const progress = Math.max(0, Math.min(1, dragDistance / rect.width));

        return {
          ...current,
          progress,
        };
      });
    },
    [],
  );

  const finishManualPdfFlip = useCallback(() => {
    const drag = pdfDragOverlay;
    if (!drag) return;

    const shouldTurn = drag.progress > 0.28 || drag.progress < 0.03;
    setPdfDragOverlay(null);

    if (shouldTurn) {
      pendingPdfTurnRef.current = {
        image: drag.image,
        direction: drag.direction,
        targetPage: drag.targetPage,
      };
      setPdfPage(drag.targetPage);
      setPdfPageInput(String(drag.targetPage));
    }
  }, [pdfDragOverlay]);

  const goToPdfPage = useCallback(
    (nextPage: number) => {
      if (pdfReadingMode === "flip") {
        changeFlipPdfPage(nextPage);
      } else {
        scrollToPdfPage(nextPage);
      }
    },
    [changeFlipPdfPage, pdfReadingMode, scrollToPdfPage],
  );

  useEffect(() => {
    if (
      pdfReadingMode !== "flip" ||
      !pdfDoc ||
      !isPdf ||
      !pdfFlipCanvasRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }

    let cancelled = false;
    let renderTask: { cancel?: () => void; promise?: Promise<void> } | null =
      null;

    async function renderFlipPage() {
      try {
        const page = await pdfDoc.getPage(pdfPage);
        if (cancelled || !pdfFlipCanvasRef.current) return;

        const canvas = pdfFlipCanvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });

        if (!context) {
          throw new Error("Canvas context unavailable.");
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = pdfViewportWidth
          ? Math.max(pdfViewportWidth - 64, 320)
          : baseViewport.width;
        const fitWidthScale = availableWidth / baseViewport.width;
        const finalScale = fitWidthScale * pdfZoom;
        const viewport = page.getViewport({ scale: finalScale });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, viewport.width, viewport.height);

        const currentRenderTask = page.render({
          canvasContext: context,
          viewport,
        });
        renderTask = currentRenderTask;

        await currentRenderTask.promise;

        const pendingTurn = pendingPdfTurnRef.current;
        if (pendingTurn && pendingTurn.targetPage === pdfPage) {
          setPdfTurnOverlay({
            ...pendingTurn,
            key: Date.now(),
          });
          pendingPdfTurnRef.current = null;
        }
      } catch (err) {
        if (
          (err as { name?: string })?.name === "RenderingCancelledException"
        ) {
          return;
        }

        console.error("Failed to render PDF flip page:", err);
        if (!cancelled) {
          setPdfError("The selected PDF page could not be displayed.");
        }
      }
    }

    renderFlipPage();

    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [isPdf, pdfDoc, pdfPage, pdfReadingMode, pdfViewportWidth, pdfZoom]);

  useEffect(() => {
    if (!isPdf || typeof window === "undefined") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA") return;

      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        goToPdfPage(pdfPage + 1);
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goToPdfPage(pdfPage - 1);
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "=") {
        event.preventDefault();
        updatePdfZoom(pdfZoom + 0.1);
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        updatePdfZoom(pdfZoom - 0.1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [goToPdfPage, isPdf, pdfPage, pdfZoom, updatePdfZoom]);

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

  const submitPdfPageInput = () => {
    const parsed = Number.parseInt(pdfPageInput, 10);
    if (Number.isNaN(parsed)) {
      setPdfPageInput(String(pdfPage));
      return;
    }

    goToPdfPage(parsed);
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
          No uploaded file was found for this volume in your browser&apos;s
          local library.
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
  const pdfZoomPercent = Math.round(pdfZoom * 100);
  const pdfShellClass = isPdf
    ? "min-h-screen bg-[#525659] flex flex-col"
    : `min-h-screen ${theme === "dark" ? "bg-[#09090b]" : theme === "sepia" ? "bg-[#f4ebd0]" : "bg-white"} flex flex-col`;

  return (
    <div className={pdfShellClass}>
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
        className={
          isPdf
            ? "sticky top-0 z-50 border-b border-white/10 bg-[#323639]/95 text-white backdrop-blur-xl"
            : `px-6 py-4 flex items-center justify-between border-b ${theme === "dark" ? "bg-black/80 border-white/5 text-white" : theme === "sepia" ? "bg-[#e5d8b6]/80 border-[#8b7355]/20 text-[#4f3824]" : "bg-white/80 border-black/5 text-black"} backdrop-blur-xl sticky top-0 z-50`
        }
      >
        {isPdf ? (
          <div className="px-4 md:px-6 py-3 flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Link
                  href={`/reader/${id}/${slug}`}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Link>
                <div className="min-w-0">
                  <h1 className="text-sm font-semibold truncate">
                    {storedVolume.fileName}
                  </h1>
                  <p className="text-xs text-white/55 truncate">{titleText}</p>
                </div>
              </div>

              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex items-center justify-center px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium transition-colors"
                >
                  Open in New Tab
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="flex items-center rounded-lg bg-black/20 border border-white/10 overflow-hidden">
                <button
                  onClick={() => goToPdfPage(pdfPage - 1)}
                  disabled={pdfPage <= 1}
                  className="px-3 py-2 text-sm text-white/90 hover:bg-white/8 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <div className="flex items-center gap-2 px-3 py-2 border-x border-white/10">
                  <input
                    value={pdfPageInput}
                    onChange={(event) =>
                      setPdfPageInput(event.target.value.replace(/\D/g, ""))
                    }
                    onBlur={submitPdfPageInput}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        submitPdfPageInput();
                        (event.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-12 bg-transparent text-center text-sm outline-none"
                    inputMode="numeric"
                    aria-label="Current page"
                  />
                  <span className="text-sm text-white/45">/</span>
                  <span className="text-sm text-white/70 min-w-8 text-center">
                    {pdfPageCount || "-"}
                  </span>
                </div>
                <button
                  onClick={() => goToPdfPage(pdfPage + 1)}
                  disabled={pdfPageCount === 0 || pdfPage >= pdfPageCount}
                  className="px-3 py-2 text-sm text-white/90 hover:bg-white/8 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>

              <div className="flex items-center rounded-lg bg-black/20 border border-white/10 overflow-hidden">
                <button
                  onClick={() => updatePdfZoom(pdfZoom - 0.1)}
                  className="p-2.5 text-white/90 hover:bg-white/8 transition-colors"
                  aria-label="Zoom out"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updatePdfZoom(1)}
                  className="px-3 py-2 text-sm font-medium text-white/90 border-x border-white/10 hover:bg-white/8 transition-colors"
                >
                  {pdfZoomPercent}%
                </button>
                <button
                  onClick={() => updatePdfZoom(pdfZoom + 0.1)}
                  className="p-2.5 text-white/90 hover:bg-white/8 transition-colors"
                  aria-label="Zoom in"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center rounded-lg bg-black/20 border border-white/10 overflow-hidden">
                {(["scroll", "flip"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      pendingPdfTurnRef.current = null;
                      setPdfTurnOverlay(null);
                      setPdfReadingMode(mode);
                    }}
                    className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                      pdfReadingMode === mode
                        ? "bg-white/15 text-white"
                        : "text-white/55 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="text-xs text-white/45 md:ml-1">
                {pdfReadingMode === "scroll"
                  ? "Scroll to read • PageUp/PageDown or arrow keys to jump pages"
                  : "Flip mode • Tap or drag page edges to turn pages"}{" "}
                • Ctrl/Cmd +/- to zoom
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 flex items-center justify-between w-full">
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
                  Local EPUB Reader
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="p-2.5 hover:bg-white/5 rounded-full transition-all"
                title="Reader Customization"
              >
                <Type className="w-4 h-4" />
              </button>
            </div>
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

      <main className="flex-1 w-full flex flex-col relative">
        {isPdf ? (
          <div
            ref={pdfScrollContainerRef}
            className="flex-1 overflow-auto px-3 py-4 md:px-8 md:py-8"
          >
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
            ) : pdfDoc ? (
              pdfReadingMode === "scroll" ? (
                <div className="flex flex-col items-center gap-6">
                  {Array.from({ length: pdfPageCount }, (_, index) => {
                    const pageNumber = index + 1;

                    return (
                      <div
                        key={pageNumber}
                        ref={(element) => {
                          pdfPageRefs.current[index] = element;
                        }}
                        data-page-number={pageNumber}
                        className="rounded-sm bg-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-black/8 overflow-hidden"
                      >
                        <PdfPageCanvas
                          pdfDoc={pdfDoc}
                          pageNumber={pageNumber}
                          zoom={pdfZoom}
                          viewportWidth={pdfViewportWidth}
                          onError={(message) => setPdfError(message)}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="min-w-max flex justify-center">
                  <div
                    ref={pdfFlipStageRef}
                    onPointerDown={startManualPdfFlip}
                    onPointerMove={moveManualPdfFlip}
                    onPointerUp={finishManualPdfFlip}
                    onPointerCancel={() => setPdfDragOverlay(null)}
                    className="relative rounded-sm bg-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-black/8 touch-none select-none cursor-pointer overflow-hidden"
                    style={{ perspective: "2200px" }}
                  >
                    <canvas ref={pdfFlipCanvasRef} className="block bg-white" />

                    <AnimatePresence>
                      {pdfDragOverlay && (
                        <motion.div
                          key="manual-drag-flip"
                          className="pointer-events-none absolute inset-0"
                          style={{
                            transformStyle: "preserve-3d",
                            transformOrigin:
                              pdfDragOverlay.direction === "next"
                                ? "right center"
                                : "left center",
                            clipPath:
                              pdfDragOverlay.direction === "next"
                                ? "polygon(0 0, 100% 0, 72% 100%, 0 100%)"
                                : "polygon(28% 0, 100% 0, 100% 100%, 0 100%)",
                            rotateY:
                              pdfDragOverlay.direction === "next"
                                ? -88 * pdfDragOverlay.progress
                                : 88 * pdfDragOverlay.progress,
                            x:
                              pdfDragOverlay.direction === "next"
                                ? -12 * pdfDragOverlay.progress
                                : 12 * pdfDragOverlay.progress,
                          }}
                          initial={false}
                        >
                          <div
                            className="absolute inset-0 bg-no-repeat bg-cover bg-center"
                            style={{
                              backgroundImage: `url(${pdfDragOverlay.image})`,
                              backgroundSize: "100% 100%",
                            }}
                          />
                          <div
                            className={`absolute inset-0 ${
                              pdfDragOverlay.direction === "next"
                                ? "bg-linear-to-l from-black/45 via-white/10 to-white/70"
                                : "bg-linear-to-r from-black/45 via-white/10 to-white/70"
                            }`}
                            style={{
                              opacity: 0.2 + pdfDragOverlay.progress * 0.65,
                            }}
                          />
                          <div
                            className={`absolute top-0 bottom-0 ${
                              pdfDragOverlay.direction === "next"
                                ? "right-0 w-[22%] bg-linear-to-l from-white via-white/65 to-transparent"
                                : "left-0 w-[22%] bg-linear-to-r from-white via-white/65 to-transparent"
                            }`}
                          />
                        </motion.div>
                      )}

                      {pdfTurnOverlay && (
                        <>
                          <motion.div
                            key={`shadow-${pdfTurnOverlay.key}`}
                            className={`pointer-events-none absolute inset-0 ${
                              pdfTurnOverlay.direction === "next"
                                ? "bg-linear-to-l from-black/25 via-black/10 to-transparent"
                                : "bg-linear-to-r from-black/25 via-black/10 to-transparent"
                            }`}
                            initial={{ opacity: 0.2 }}
                            animate={{ opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.65, ease: "easeOut" }}
                          />

                          <motion.div
                            key={pdfTurnOverlay.key}
                            className="pointer-events-none absolute inset-0"
                            style={{
                              transformStyle: "preserve-3d",
                              transformOrigin:
                                pdfTurnOverlay.direction === "next"
                                  ? "right center"
                                  : "left center",
                              clipPath:
                                pdfTurnOverlay.direction === "next"
                                  ? "polygon(0 0, 100% 0, 72% 100%, 0 100%)"
                                  : "polygon(28% 0, 100% 0, 100% 100%, 0 100%)",
                            }}
                            initial={{ rotateY: 0, x: 0, opacity: 1 }}
                            animate={{
                              rotateY:
                                pdfTurnOverlay.direction === "next" ? -88 : 88,
                              x: pdfTurnOverlay.direction === "next" ? -10 : 10,
                              opacity: 0.14,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: 0.72,
                              ease: [0.22, 0.61, 0.36, 1],
                            }}
                            onAnimationComplete={() => setPdfTurnOverlay(null)}
                          >
                            <div
                              className="absolute inset-0 bg-no-repeat bg-cover bg-center"
                              style={{
                                backgroundImage: `url(${pdfTurnOverlay.image})`,
                                backgroundSize: "100% 100%",
                              }}
                            />
                            <div
                              className={`absolute inset-0 ${
                                pdfTurnOverlay.direction === "next"
                                  ? "bg-linear-to-l from-black/45 via-black/15 to-white/10"
                                  : "bg-linear-to-r from-black/45 via-black/15 to-white/10"
                              }`}
                            />
                            <div
                              className={`absolute top-0 bottom-0 ${
                                pdfTurnOverlay.direction === "next"
                                  ? "right-0 w-[18%] bg-linear-to-l from-white/80 via-white/35 to-transparent"
                                  : "left-0 w-[18%] bg-linear-to-r from-white/80 via-white/35 to-transparent"
                              }`}
                            />
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center text-white/60 text-sm min-h-[50vh]">
                Loading PDF pages...
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-3xl w-full mx-auto px-6 py-10 flex-1 flex flex-col justify-between">
            <div ref={epubViewerRef} className="flex-1 min-h-[75vh]" />
          </div>
        )}
      </main>
    </div>
  );
}
