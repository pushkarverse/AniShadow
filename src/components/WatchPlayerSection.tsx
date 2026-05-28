"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayerWrapper } from "@/components/PlayerWrapper";
import { List, X, Play } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface ServerEntry {
  name: string;
  provider: string;
  url: string;
  kind?: "dub" | "other";
  label?: string;
}

interface EpisodeEntry {
  id: string;
  number: number;
  title?: string;
  image?: string;
}

interface WatchPlayerSectionProps {
  videoUrl: string;
  title: string;
  episodeTitle: string;
  poster?: string;
  description?: string;
  allServers?: ServerEntry[];
  episodes?: EpisodeEntry[];
  currentEpisodeNumber?: number;
  animeId?: string;
  animeSlug?: string;
}

export function WatchPlayerSection({
  videoUrl,
  title,
  episodeTitle,
  poster,
  description,
  allServers = [],
  episodes = [],
  currentEpisodeNumber,
  animeId,
  animeSlug
}: WatchPlayerSectionProps) {
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);
  const [selectedServer, setSelectedServer] = useState(allServers[0]?.name || "Primary");
  const [activeServerGroup, setActiveServerGroup] = useState<"dub" | "other">("other");
  const [showEpisodesSheet, setShowEpisodesSheet] = useState(false);

  const groupedServers = useMemo(() => {
    const dub: ServerEntry[] = [];
    const other: ServerEntry[] = [];

    for (const server of allServers) {
      if (server.kind === "dub") {
        dub.push(server);
      } else {
        other.push(server);
      }
    }

    return {
      dub,
      other
    };
  }, [allServers]);

  const activeGroupServers = activeServerGroup === "dub" ? groupedServers.dub : groupedServers.other;

  const activeServerLabel = activeServerGroup === "dub" ? "English Dub" : "Sub";

  useEffect(() => {
    setCurrentVideoUrl(videoUrl);

    const preferredGroup = groupedServers.other.length > 0 ? "other" : "dub";
    setActiveServerGroup(preferredGroup);

    const preferredServer = (preferredGroup === "other" ? groupedServers.other : groupedServers.dub)[0] || allServers[0];
    if (preferredServer) {
      setSelectedServer(preferredServer.name);
      setCurrentVideoUrl(preferredServer.url);
    }
  }, [videoUrl, groupedServers.dub, groupedServers.other, allServers]);

  const switchGroup = (kind: "dub" | "other") => {
    setActiveServerGroup(kind);
    const nextServer = (kind === "dub" ? groupedServers.dub : groupedServers.other)[0];
    if (!nextServer) return;
    setSelectedServer(nextServer.name);
    setCurrentVideoUrl(nextServer.url);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Server & Audio Switcher - padded on mobile */}
      <div className="px-4 md:px-0">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/80 px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mr-1">
              Switch Audio
            </span>
            <button
              onClick={() => switchGroup("other")}
              disabled={groupedServers.other.length === 0}
              suppressHydrationWarning={true}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest border transition-all ${
                activeServerGroup === "other"
                  ? "bg-primary/15 border-primary text-primary"
                  : "bg-white/5 border-white/10 text-white/35 hover:text-white"
              } ${groupedServers.other.length === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              Sub
            </button>
            <button
              onClick={() => switchGroup("dub")}
              disabled={groupedServers.dub.length === 0}
              suppressHydrationWarning={true}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest border transition-all ${
                activeServerGroup === "dub"
                  ? "bg-primary/15 border-primary text-primary"
                  : "bg-white/5 border-white/10 text-white/35 hover:text-white"
              } ${groupedServers.dub.length === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              Dub
            </button>
          </div>
          <button
            disabled={activeGroupServers.length === 0}
            suppressHydrationWarning={true}
            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
              activeGroupServers.length > 0 ? "bg-white/5 border-white/10 text-white/40 hover:text-white" : "bg-white/5 border-white/10 text-white/20"
            } ${activeGroupServers.length === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {activeServerLabel}
          </button>
        </div>
      </div>

      {/* Video Player Wrapper - Full bleed on mobile */}
      <div className="w-full md:rounded-3xl overflow-hidden bg-black md:border border-white/5 shadow-2xl relative group/player">
        {currentVideoUrl ? (
          <PlayerWrapper
            videoUrl={currentVideoUrl}
            title={title}
            episodeTitle={episodeTitle}
            poster={poster}
          />
        ) : (
          <div className="aspect-video relative flex items-center justify-center bg-[#080808] overflow-hidden">
            {poster && (
              <div
                className="absolute inset-0 bg-cover bg-center blur-[80px] opacity-30 scale-110"
                style={{ backgroundImage: `url(${poster})` }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center gap-4 text-center px-8">
              <p className="text-xl font-black uppercase tracking-[0.2em] text-primary/40">
                Episode Not Found
              </p>
              <p className="text-xs text-white/20 font-medium max-w-md">
                This episode might not be released yet or is unavailable on all providers right now.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Episode Switcher Trigger Button */}
      {episodes.length > 0 && (
        <div className="md:hidden px-4">
          <button
            onClick={() => setShowEpisodesSheet(true)}
            className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-[0.98] cursor-pointer"
          >
            <List className="w-4 h-4 text-primary" />
            <span>Select Episode ({currentEpisodeNumber} / {episodes.length})</span>
          </button>
        </div>
      )}

      {/* Info details & description - padded on mobile */}
      <div className="px-4 md:px-0 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tighter leading-none text-white">{title}</h1>
          <p className="text-lg text-primary font-black uppercase tracking-widest opacity-80">
            {episodeTitle}
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-md">
          <div
            className="text-white/60 leading-relaxed italic line-clamp-3 font-medium [&>i]:font-serif [&>i]:text-white/90 [&>br]:hidden"
            dangerouslySetInnerHTML={{ __html: description || "No description available." }}
          />
        </div>
      </div>

      {/* Bottom Sheet for Episodes (Mobile PWA) */}
      <AnimatePresence>
        {showEpisodesSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEpisodesSheet(false)}
              className="fixed inset-0 bg-black z-[9998] backdrop-blur-xs md:hidden"
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#0c0c0c] border-t border-white/10 rounded-t-3xl max-h-[75vh] flex flex-col overflow-hidden md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0 bg-gradient-to-b from-white/[0.02] to-transparent">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Select Episode</span>
                  <h4 className="text-sm font-bold text-white/90 truncate max-w-[200px]">{title}</h4>
                </div>
                <button
                  onClick={() => setShowEpisodesSheet(false)}
                  className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* List of Episodes */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {episodes.map((episode) => {
                    const isActive = episode.number === currentEpisodeNumber;
                    const targetUrl = `/watch/${animeId}/${animeSlug}?ep=${episode.number}`;

                    return (
                      <Link
                        key={episode.id}
                        href={targetUrl}
                        onClick={() => setShowEpisodesSheet(false)}
                        className={`flex items-center gap-4 p-3 rounded-2xl transition-all border ${
                          isActive
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                            : "bg-white/5 border-white/5 hover:border-white/20 text-white/50 hover:text-white"
                        }`}
                      >
                        <div className="relative w-20 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-[#121212]">
                          <img
                            src={poster || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iqITmI6.png"}
                            alt={episode.title || `Episode ${episode.number}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{episode.number}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          <span className="text-xs font-semibold truncate leading-tight">
                            {episode.title || `Episode ${episode.number}`}
                          </span>
                          <span className="text-[9px] text-white/30 font-medium">
                            Episode {episode.number}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}