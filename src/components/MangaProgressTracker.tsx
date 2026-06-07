"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

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
  pageNumber?: number;
  totalPages?: number;
  percent?: number;
  completed?: boolean;
}

// Helper to get progress map from localStorage
function getProgressMap(): Record<string, SavedProgress> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem("mangashadow-progress");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// 1. Poster badge overlay
export function MangaProgressPosterBadge({ mangaId }: { mangaId: string }) {
  const [progress, setProgress] = useState<SavedProgress | null>(null);

  useEffect(() => {
    const progressMap = getProgressMap();
    if (progressMap[mangaId]) {
      setProgress(progressMap[mangaId]);
    }
  }, [mangaId]);

  if (!progress) return null;

  return (
    <div className="bg-primary/95 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full absolute bottom-4 left-4 z-20 shadow-lg shadow-primary/20 border border-white/10 animate-fade-in">
      Last Read: Ch {progress.chapterNumber}
    </div>
  );
}

// 2. Info text shown under the title
export function MangaProgressText({ mangaId }: { mangaId: string }) {
  const [progress, setProgress] = useState<SavedProgress | null>(null);

  useEffect(() => {
    const progressMap = getProgressMap();
    if (progressMap[mangaId]) {
      setProgress(progressMap[mangaId]);
    }
  }, [mangaId]);

  if (!progress) return null;

  return (
    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      <span>Last Read Chapter {progress.chapterNumber}</span>
    </div>
  );
}

// 3. Dynamic Read Button
export function MangaProgressButton({ 
  mangaId, 
  slug, 
  chapters 
}: { 
  mangaId: string; 
  slug: string; 
  chapters: Chapter[] 
}) {
  const [progress, setProgress] = useState<SavedProgress | null>(null);

  useEffect(() => {
    const progressMap = getProgressMap();
    if (progressMap[mangaId]) {
      setProgress(progressMap[mangaId]);
    }
  }, [mangaId]);

  if (chapters.length === 0) return null;

  // Determine if chapters are ordered ascending (Ch 1 first) or descending (Ch 1 last)
  const firstNum = parseFloat(chapters[0]?.number || "0");
  const lastNum = parseFloat(chapters[chapters.length - 1]?.number || "0");
  const isAscending = firstNum <= lastNum;

  // Set default start chapter (lowest) even if list is descending
  const startChapter = isAscending ? chapters[0] : chapters[chapters.length - 1];
  let targetChapter = startChapter;
  let buttonText = `Read Chapter ${targetChapter.number || "1"}`;

  if (progress) {
    const currentIndex = chapters.findIndex((c) => c.id === progress.chapterId);
    const isCompleted = !!progress.completed;
    
    if (currentIndex !== -1) {
      if (!isCompleted) {
        targetChapter = chapters[currentIndex];
        buttonText = `Continue Chapter ${targetChapter.number}`;
      } else {
        // Find next chapter index based on sorting order
        const nextIndex = isAscending ? currentIndex + 1 : currentIndex - 1;
        
        if (nextIndex >= 0 && nextIndex < chapters.length) {
          targetChapter = chapters[nextIndex];
          buttonText = `Continue Chapter ${targetChapter.number}`;
        } else {
          // No next chapter (already at latest chapter)
          targetChapter = chapters[currentIndex];
          buttonText = `Re-Read Chapter ${targetChapter.number}`;
        }
      }
    } else {
      // Saved chapter is no longer in the list or ID mismatch, fallback to saved chapter number search
      const matchedChapter = chapters.find((c) => c.number === progress.chapterNumber);
      if (matchedChapter) {
        if (!isCompleted) {
          targetChapter = matchedChapter;
          buttonText = `Continue Chapter ${targetChapter.number}`;
        } else {
          const fallbackIndex = chapters.indexOf(matchedChapter);
          const nextIndex = isAscending ? fallbackIndex + 1 : fallbackIndex - 1;
          if (nextIndex >= 0 && nextIndex < chapters.length) {
            targetChapter = chapters[nextIndex];
            buttonText = `Continue Chapter ${targetChapter.number}`;
          } else {
            targetChapter = matchedChapter;
            buttonText = `Re-Read Chapter ${targetChapter.number}`;
          }
        }
      }
    }
  }

  return (
    <Link 
      href={`/reader/read/${mangaId}/${slug}/${targetChapter.id}`}
      className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:scale-105 transition-all"
    >
      <BookOpen className="w-5 h-5" />
      {buttonText}
    </Link>
  );
}
