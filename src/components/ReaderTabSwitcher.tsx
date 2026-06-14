"use client";

import { motion } from "framer-motion";
import { BookOpen, BookText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

interface ReaderTabSwitcherProps {
  activeTab: "manga" | "novel";
}

export function ReaderTabSwitcher({ activeTab }: ReaderTabSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (tab: "manga" | "novel") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    NProgress.start();
    router.push(`/reader?${params.toString()}`);
  };

  return (
    <div className="flex justify-center mb-12">
      <div className="flex p-1.5 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl relative shadow-2xl">
        {/* Manga Tab */}
        <button
          onClick={() => handleTabChange("manga")}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${
            activeTab === "manga" ? "text-white" : "text-white/40 hover:text-white/80"
          }`}
        >
          {activeTab === "manga" && (
            <motion.div
              layoutId="active-reader-tab"
              className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-lg shadow-primary/20"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <BookOpen className="w-4 h-4" />
          <span>Manga & Manhwa</span>
        </button>

        {/* Novel Tab */}
        <button
          onClick={() => handleTabChange("novel")}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${
            activeTab === "novel" ? "text-white" : "text-white/40 hover:text-white/80"
          }`}
        >
          {activeTab === "novel" && (
            <motion.div
              layoutId="active-reader-tab"
              className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-lg shadow-primary/20"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <BookText className="w-4 h-4" />
          <span>Novels & Webnovels</span>
        </button>
      </div>
    </div>
  );
}
