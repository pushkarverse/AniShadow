"use client";

import React, { useEffect, useRef } from "react";

interface PdfPageProps {
  pdfDoc: any;
  pageNumber: number;
  viewportWidth: number;
  active: boolean;
  /** 1 = fit to viewport width; 0.25–5 for 25%–500% */
  zoomScale?: number;
  onError: (message: string) => void;
}

export const PdfPage = React.memo(function PdfPage({
  pdfDoc,
  pageNumber,
  viewportWidth,
  active,
  zoomScale = 1,
  onError,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    if (
      !active ||
      !pdfDoc ||
      !canvasRef.current ||
      typeof window === "undefined"
    )
      return;

    let cancelled = false;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = viewportWidth
          ? Math.max(viewportWidth, 120)
          : baseViewport.width;
        const fitWidthScale = availableWidth / baseViewport.width;
        const renderScale = fitWidthScale * zoomScale;
        const viewport = page.getViewport({ scale: renderScale });
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

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport,
        });
        await renderTaskRef.current.promise;
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") return;
        console.error(err);
        onError(`Page ${pageNumber} failed to render.`);
      }
    }

    renderPage();
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [active, zoomScale, onError, pageNumber, pdfDoc, viewportWidth]);

  if (!active) {
    return (
      <div className="flex aspect-[1/1.4] w-full items-center justify-center bg-white/5 rounded-sm text-[10px] font-black uppercase tracking-widest text-white/10 border border-white/5 animate-pulse">
        Page {pageNumber}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="block bg-white shadow-2xl shadow-black/80 rounded-sm mx-auto transition-opacity duration-500"
    />
  );
});
