"use client";

import { useState } from "react";
import { ListOrdered } from "lucide-react";
import { ReaderChapterList, ArcSelector } from "@/components/ReaderChapterList";

interface ChapterSectionProps {
  mangaId: string;
  slug: string;
  chapters: any[];
  arcs: any[];
  isNovel: boolean;
  heading?: string;
}

export function ReaderChapterSection({ mangaId, slug, chapters, arcs, isNovel, heading }: ChapterSectionProps) {
  const [selectedArc, setSelectedArc] = useState<number>(arcs[0]?.number || 1);
  const arcCount = arcs.length;
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-white/5 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <ListOrdered className="w-6 h-6 text-primary shrink-0" />
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
              {heading || (isNovel ? "Chapters" : "Chapters List")}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mt-1">
              {arcCount > 0 ? `${arcCount} Arcs · ` : ""}{chapters.length} Total
            </p>
          </div>
        </div>

        {arcCount > 0 && (
          <div className="sm:ml-auto shrink-0 w-full sm:w-auto sm:max-w-[55%]">
            <ArcSelector arcs={arcs} selectedArc={selectedArc} onSelectArc={setSelectedArc} />
          </div>
        )}
      </div>

      <ReaderChapterList
        mangaId={mangaId}
        slug={slug}
        chapters={chapters}
        arcs={arcs}
        variant={isNovel ? "novel" : "manga"}
        selectedArc={selectedArc}
      />
    </>
  );
}
