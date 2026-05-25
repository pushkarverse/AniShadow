"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Check } from "lucide-react";

interface Chapter {
  id: string;
  number: string;
  title?: string;
}

interface SavedProgress {
  chapterId: string;
  chapterNumber: string;
  chapterTitle: string;
  readAt: string;
}

function getProgressMap(): Record<string, SavedProgress> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem("mangashadow-progress");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function MangaChapterList({
  mangaId,
  slug,
  chapters
}: {
  mangaId: string;
  slug: string;
  chapters: Chapter[];
}) {
  const [progress, setProgress] = useState<SavedProgress | null>(null);

  useEffect(() => {
    const progressMap = getProgressMap();
    if (progressMap[mangaId]) {
      setProgress(progressMap[mangaId]);
    }
  }, [mangaId]);

  const isAscending = useMemo(() => {
    const firstNum = parseFloat(chapters[0]?.number || "0");
    const lastNum = parseFloat(chapters[chapters.length - 1]?.number || "0");
    return firstNum <= lastNum;
  }, [chapters]);

  const readSet = useMemo(() => {
    if (!progress || chapters.length === 0) return new Set<string>();

    let currentIndex = chapters.findIndex((c) => c.id === progress.chapterId);

    if (currentIndex === -1) {
      const matched = chapters.findIndex((c) => c.number === progress.chapterNumber);
      currentIndex = matched;
    }

    if (currentIndex === -1) return new Set<string>();

    const ids = new Set<string>();
    if (isAscending) {
      for (let i = 0; i <= currentIndex; i += 1) ids.add(chapters[i].id);
    } else {
      for (let i = currentIndex; i < chapters.length; i += 1) ids.add(chapters[i].id);
    }
    return ids;
  }, [chapters, isAscending, progress]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {chapters.length > 0 ? chapters.map((chapter, index) => {
        const isRead = readSet.has(chapter.id);

        return (
          <Link
            key={chapter.id}
            href={`/manga/read/${mangaId}/${slug}/${chapter.id}`}
            className={`group flex items-center justify-between p-4 border rounded-2xl transition-all ${isRead ? "bg-primary/5 border-primary/20" : "bg-white/5 hover:bg-white/10 border-white/5"}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${isRead ? "bg-primary text-white" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"}`}>
                {chapter.number || index + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-bold transition-colors ${isRead ? "text-white" : "text-white/80 group-hover:text-white"}`}>
                    Chapter {chapter.number || index + 1}
                  </h4>
                  {isRead && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                      <Check className="w-3 h-3" />
                      Read
                    </span>
                  )}
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest line-clamp-1 ${isRead ? "text-white/40" : "text-white/20"}`}>
                  {chapter.title || "Untitled Chapter"}
                </p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 transition-all translate-x-0 group-hover:translate-x-1 ${isRead ? "text-primary" : "text-white/20 group-hover:text-primary"}`} />
          </Link>
        );
      }) : (
        <div className="col-span-full py-20 text-center text-white/20 font-medium italic bg-white/5 rounded-[2.5rem] border border-white/5">
          No chapters indexed yet. Our library is updating daily.
        </div>
      )}
    </div>
  );
}
