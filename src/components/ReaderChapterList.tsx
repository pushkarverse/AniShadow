
import Link from "@/compat/Link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Check, BookOpen } from "lucide-react";
import {
  WITCHCULT_NOVEL_ID,
  getChapterDisplayTitle,
  getReaderChapterPath,
  readerChapterIdsMatch
} from "@/lib/rezero";

interface Chapter {
  id: string;
  number: string;
  title?: string;
  arc?: number;
  arcTitle?: string;
  chapterInArc?: number;
}

interface ReaderArc {
  number: number;
  title: string;
  chapters: Chapter[];
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

export function ArcSelector({
  arcs,
  selectedArc,
  onSelectArc,
  compact = false
}: {
  arcs: ReaderArc[];
  selectedArc: number;
  onSelectArc: (arc: number) => void;
  compact?: boolean;
}) {
  if (arcs.length === 0) return null;

  const btnClass = compact
    ? "px-2.5 py-1 text-[9px]"
    : "px-3 py-1.5 text-[10px]";

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar max-w-full">
      {arcs.map((arc) => (
        <button
          key={arc.number}
          type="button"
          onClick={() => onSelectArc(arc.number)}
          title={arc.title}
          className={`shrink-0 ${btnClass} rounded-full font-black uppercase tracking-widest transition-all border ${
            selectedArc === arc.number
              ? "bg-primary text-white border-primary/40 shadow-lg shadow-primary/20"
              : "bg-white/5 text-white/50 border-white/5 hover:bg-white/10 hover:text-white"
          }`}
        >
          Arc {arc.number}
        </button>
      ))}
    </div>
  );
}

export function ReaderChapterList({
  mangaId,
  slug,
  chapters,
  arcs = [],
  variant = "manga",
  selectedArc = 1
}: {
  mangaId: string;
  slug: string;
  chapters: Chapter[];
  arcs?: ReaderArc[];
  variant?: "manga" | "novel";
  selectedArc?: number;
}) {
  const [progress, setProgress] = useState<SavedProgress | null>(null);

  const isArcWise = arcs.length > 0;
  const isNovel = variant === "novel";
  const isReZero = mangaId === WITCHCULT_NOVEL_ID;

  useEffect(() => {
    const progressMap = getProgressMap();
    if (progressMap[mangaId]) {
      setProgress(progressMap[mangaId]);
    }
  }, [mangaId]);

  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => {
      const numA = parseFloat(a.number || "0");
      const numB = parseFloat(b.number || "0");
      return numA - numB;
    });
  }, [chapters]);

  const displayedChapters = useMemo(() => {
    if (!isArcWise) return sortedChapters;
    return sortedChapters.filter((c) => c.arc === selectedArc);
  }, [sortedChapters, isArcWise, selectedArc]);

  const readSet = useMemo(() => {
    if (!progress || sortedChapters.length === 0) return new Set<string>();

    let currentIndex = sortedChapters.findIndex((c) => readerChapterIdsMatch(c.id, progress.chapterId));

    if (currentIndex === -1) {
      const matched = sortedChapters.findIndex((c) => c.number === progress.chapterNumber);
      currentIndex = matched;
    }

    if (currentIndex === -1) return new Set<string>();

    const ids = new Set<string>();
    for (let i = 0; i <= currentIndex; i += 1) {
      ids.add(sortedChapters[i].id);
    }
    return ids;
  }, [sortedChapters, progress]);

  const gridClass = isNovel ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 md:grid-cols-2 gap-3";

  return (
    <div className={gridClass}>
      {displayedChapters.length > 0 ? displayedChapters.map((chapter) => {
        const isRead = readSet.has(chapter.id);

        if (isNovel) {
          return (
            <Link
              key={chapter.id}
              href={getReaderChapterPath(mangaId, slug, chapter.id)}
              className={`group flex items-center gap-4 p-4 border rounded-2xl transition-all ${
                isRead
                  ? "bg-primary/5 border-primary/20"
                  : isReZero
                    ? "bg-gradient-to-r from-[#1a0a2e]/40 to-white/[0.03] hover:from-[#1a0a2e]/60 hover:to-white/[0.06] border-[#6b21a8]/20 hover:border-[#9333ea]/30"
                    : "bg-white/5 hover:bg-white/10 border-white/5"
              }`}
            >
              <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isRead
                  ? "bg-primary text-white"
                  : isReZero
                    ? "bg-[#6b21a8]/30 text-[#c084fc] group-hover:bg-[#9333ea] group-hover:text-white"
                    : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
              }`}>
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-semibold transition-colors truncate ${
                    isRead ? "text-white" : "text-white/85 group-hover:text-white"
                  }`}>
                    {getChapterDisplayTitle(chapter.id, chapter)}
                  </h4>
                  {isRead && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shrink-0">
                      <Check className="w-3 h-3" />
                      Read
                    </span>
                  )}
                </div>

              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 transition-all translate-x-0 group-hover:translate-x-1 ${
                isRead ? "text-primary" : "text-white/20 group-hover:text-primary"
              }`} />
            </Link>
          );
        }

        return (
          <Link
            key={chapter.id}
            href={getReaderChapterPath(mangaId, slug, chapter.id)}
            className={`group flex items-center justify-between p-4 border rounded-2xl transition-all ${isRead ? "bg-primary/5 border-primary/20" : "bg-white/5 hover:bg-white/10 border-white/5"}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${isRead ? "bg-primary text-white" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"}`}>
                {chapter.number}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-bold transition-colors ${isRead ? "text-white" : "text-white/80 group-hover:text-white"}`}>
                    Chapter {chapter.number}
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
          No chapters in this arc yet.
        </div>
      )}
    </div>
  );
}
