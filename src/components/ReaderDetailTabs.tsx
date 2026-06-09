"use client";

import { useState } from "react";
import { BookOpen, ListOrdered } from "lucide-react";
import { ReaderChapterSection } from "./ReaderChapterSection";
import { ReaderVolumeSection } from "./ReaderVolumeSection";
import { motion } from "framer-motion";
import { WITCHCULT_NOVEL_ID } from "@/lib/rezero";

interface ReaderDetailTabsProps {
  mangaId: string;
  slug: string;
  title: string;
  volumesCount?: number;
  chapters: any[];
  arcs: any[];
  isNovel: boolean;
}

export function ReaderDetailTabs({
  mangaId,
  slug,
  title,
  volumesCount,
  chapters,
  arcs,
  isNovel
}: ReaderDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<"chapters" | "volumes">(
    isNovel && chapters.length === 0 ? "volumes" : "chapters"
  );

  const isReZero = mangaId === WITCHCULT_NOVEL_ID;
  const showVolumesOption = isNovel;
  const showChaptersOption = chapters.length > 0 || !isNovel;
  const chaptersTabLabel = isReZero ? "WN" : "Chapters";
  const volumesTabLabel = isReZero ? "LN" : "Volumes";
  const chaptersHeading = isReZero ? "Web Novel Chapters" : undefined;

  if (!showVolumesOption) {
    return (
      <ReaderChapterSection
        mangaId={mangaId}
        slug={slug}
        chapters={chapters}
        arcs={arcs}
        isNovel={isNovel}
        heading={chaptersHeading}
      />
    );
  }

  return (
    <div className="space-y-8">
      {showChaptersOption && (
        <div className="flex justify-start mb-6 border-b border-white/5">
          <div className="flex gap-4 p-1 bg-white/5 rounded-2xl relative border border-white/5">
            <button
              onClick={() => setActiveTab("chapters")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${activeTab === "chapters" ? "text-white" : "text-white/40 hover:text-white/80"
                }`}
            >
              {activeTab === "chapters" && (
                <motion.div
                  layoutId="detail-tabs-bg"
                  className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-lg shadow-primary/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <ListOrdered className="w-4 h-4" />
              <span>{chaptersTabLabel}</span>
            </button>

            <button
              onClick={() => setActiveTab("volumes")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${activeTab === "volumes" ? "text-white" : "text-white/40 hover:text-white/80"
                }`}
            >
              {activeTab === "volumes" && (
                <motion.div
                  layoutId="detail-tabs-bg"
                  className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-lg shadow-primary/20"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <BookOpen className="w-4 h-4" />
              <span>{volumesTabLabel}</span>
            </button>
          </div>
        </div>
      )}

      <div>
        {activeTab === "chapters" ? (
          <ReaderChapterSection
            mangaId={mangaId}
            slug={slug}
            chapters={chapters}
            arcs={arcs}
            isNovel={isNovel}
            heading={chaptersHeading}
          />
        ) : (
          <ReaderVolumeSection
            mangaId={mangaId}
            slug={slug}
            title={title}
            volumesCount={volumesCount}
          />
        )}
      </div>
    </div>
  );
}
