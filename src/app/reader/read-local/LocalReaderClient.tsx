"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { getVolume, StoredVolume } from "@/lib/indexedDb";
import { EpubReader } from "./EpubReader";

interface LocalReaderClientProps {
  id: string;
  slug: string;
  vol: number;
}

export function LocalReaderClient({ id, slug, vol }: LocalReaderClientProps) {
  const [loading, setLoading] = useState(true);
  const [storedVolume, setStoredVolume] = useState<StoredVolume | null>(null);
  const [libLoaded, setLibLoaded] = useState({ epub: false });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfControlsVisible, setPdfControlsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const controlsTimeoutRef = useRef<any>(null);

  const isPdf = storedVolume?.fileType?.toLowerCase().includes("pdf") ?? false;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const data = await getVolume(id, vol);
        if (data) {
          setStoredVolume(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, vol]);

  useEffect(() => {
    if (storedVolume && isPdf) {
      const url = URL.createObjectURL(storedVolume.fileBlob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [storedVolume, isPdf]);

  const toggleControls = useCallback(() => {
    if (!isMobile) return;
    setPdfControlsVisible((v) => !v);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(
      () => setPdfControlsVisible(false),
      4000,
    );
  }, [isMobile]);

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!storedVolume) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-3xl font-black text-primary uppercase italic mb-4 tracking-tighter">
          File Not Found
        </h1>
        <p className="text-white/40 text-sm max-w-sm mb-8">
          No uploaded file found for this volume.
        </p>
        <Link
          href={`/reader/${id}/${slug}`}
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs"
        >
          Go Back
        </Link>
      </div>
    );
  }

  const titleText = `${slug.replace(/-/g, " ")} - Volume ${vol}`;

  const showMobileHeader = isMobile || !isPdf;
  const documentTitle = storedVolume.fileName.replace(/\.[^/.]+$/, "");

  return (
    <div className={`min-h-[100dvh] flex flex-col bg-[#08020c] reader-theme`}>
      <Script
        src="https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js"
        strategy="lazyOnload"
        onLoad={() => setLibLoaded((p) => ({ ...p, epub: true }))}
      />

      {showMobileHeader && (
        <header
          className={`fixed top-0 left-0 right-0 z-100 border-b border-primary/20 bg-[#0c0410]/95 backdrop-blur-xl transition-all duration-500 ${isMobile && !pdfControlsVisible ? "-translate-y-full" : "translate-y-0"}`}
        >
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/reader/${id}/${slug}`}
                className="p-2 rounded-xl bg-white/5 text-primary hover:bg-primary/20 transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </Link>
              <div className="hidden sm:block">
                <h1 className="max-w-50 text-xs font-black uppercase tracking-[0.2em] text-white/90 truncate">
                  {documentTitle}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                {titleText}
              </span>
            </div>
          </div>
        </header>
      )}

      <main
        className={`flex-1 flex flex-col relative w-full h-full ${showMobileHeader ? "pt-16" : ""}`}
      >
        {isPdf ? (
          pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
              className="w-full h-[calc(100vh-64px)] lg:h-screen border-none bg-white"
              title={documentTitle}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/20 text-xs font-black tracking-widest"></div>
          )
        ) : (
          <EpubReader fileBlob={storedVolume.fileBlob} />
        )}
      </main>
    </div>
  );
}
