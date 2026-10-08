
import { useEffect, useRef } from "react";

interface EpubReaderProps {
  fileBlob: Blob;
}

export function EpubReader({ fileBlob }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookInstanceRef = useRef<any>(null);

  useEffect(() => {
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
      const book = (window as any).ePub(fileBlob);
      bookInstanceRef.current = book;

      const rendition = book.renderTo(viewerRef.current, {
        width: "100%",
        height: "100%",
        spread: "none",
        flow: "scrolled-doc",
      });

      rendition.display();

      // Apply basic styles
      rendition.themes.default({
        body: {
          background: "transparent !important",
          color: "inherit !important",
          padding: "40px 0 !important",
        },
      });
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
  }, [fileBlob]);

  return <div ref={viewerRef} className="max-w-3xl mx-auto h-full px-6" />;
}
