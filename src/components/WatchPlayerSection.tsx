"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayerWrapper } from "@/components/PlayerWrapper";
import { List, X, ChevronLeft } from "lucide-react";
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

// Color conversion helpers for theme syncing
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const kVal = k(n);
    return l - a * Math.max(-1, Math.min(kVal - 3, 9 - kVal, 1));
  };
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Load theater mode preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("theaterMode");
    if (saved === "true") {
      setIsTheaterMode(true);
    }
  }, []);

  // Theme Sync effect: Extract average color of the anime's poster art
  useEffect(() => {
    if (!poster) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = poster;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 1, 1);
        const imgData = ctx.getImageData(0, 0, 1, 1).data;
        const [r, g, b] = Array.from(imgData);

        // Convert to HSL to adjust saturation and lightness for styling
        const [h, s, l] = rgbToHsl(r, g, b);

        // Saturation 70% to 90%, Lightness 45% to 58% to guarantee readable contrast on dark backgrounds
        const finalS = Math.max(70, Math.min(s, 90));
        const finalL = Math.max(45, Math.min(l, 58));

        const [pr, pg, pb] = hslToRgb(h, finalS, finalL);
        const primaryHex = rgbToHex(pr, pg, pb);

        // Generate slightly brighter accent color
        const accentL = Math.min(finalL + 12, 72);
        const [ar, ag, ab] = hslToRgb(h, finalS, accentL);
        const accentHex = rgbToHex(ar, ag, ab);

        // Apply theme colors globally
        document.documentElement.style.setProperty("--color-primary", primaryHex);
        document.documentElement.style.setProperty("--color-accent", accentHex);
        document.documentElement.style.setProperty("--shadow-primary", `0 0 15px rgba(${pr}, ${pg}, ${pb}, 0.4)`);
      } catch (err) {
        console.warn("Failed to extract color from poster image due to canvas restriction:", err);
      }
    };

    return () => {
      // Revert style properties to initial configuration on unmount
      document.documentElement.style.removeProperty("--color-primary");
      document.documentElement.style.removeProperty("--color-accent");
      document.documentElement.style.removeProperty("--shadow-primary");
    };
  }, [poster]);

  const handleTheaterToggle = () => {
    setIsTheaterMode((prev) => {
      const next = !prev;
      localStorage.setItem("theaterMode", String(next));
      return next;
    });
  };

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

    return { dub, other };
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

  // Rendering Helper Sub-components for flexible grid options
  const renderBackButton = () => (
    <Link
      href={`/anime/${animeId}/${animeSlug}`}
      className="hidden md:inline-flex items-center gap-2 text-white/40 hover:text-primary transition-all mb-1 group font-black uppercase tracking-widest text-[10px]"
    >
      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
      <span>Back to Series</span>
    </Link>
  );

  const renderAudioSwitcher = () => (
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
            activeGroupServers.length > 0
              ? "bg-white/5 border-white/10 text-white/40 hover:text-white"
              : "bg-white/5 border-white/10 text-white/20"
          } ${activeGroupServers.length === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          {activeServerLabel}
        </button>
      </div>
    </div>
  );

  const renderPlayer = () => (
    <div className="w-full md:rounded-3xl overflow-hidden bg-black md:border border-white/5 shadow-2xl relative group/player">
      {currentVideoUrl ? (
        <PlayerWrapper
          videoUrl={currentVideoUrl}
          title={title}
          episodeTitle={episodeTitle}
          poster={poster}
          isTheaterMode={isTheaterMode}
          onTheaterToggle={handleTheaterToggle}
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
  );

  const renderMobileSheetTrigger = () =>
    episodes.length > 0 && (
      <div className="md:hidden px-4">
        <button
          onClick={() => setShowEpisodesSheet(true)}
          className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-[0.98] cursor-pointer"
        >
          <List className="w-4 h-4 text-primary" />
          <span>Select Episode ({currentEpisodeNumber} / {episodes.length})</span>
        </button>
      </div>
    );

  const renderInfoDetails = () => (
    <div className="px-4 md:px-0 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(1.5rem,4vw,2.5rem)] font-black tracking-tighter leading-none text-white">
          {title}
        </h1>
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
  );

  const renderSidebar = () => (
    <div className="hidden lg:flex w-full lg:w-80 flex-col gap-4 shrink-0">
      <h3 className="text-lg font-semibold px-2">Episodes</h3>
      <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {episodes.map((episode) => {
          const isActive = episode.number === currentEpisodeNumber;
          const targetUrl = `/watch/${animeId}/${animeSlug}?ep=${episode.number}`;

          return (
            <Link
              key={episode.id}
              href={targetUrl}
              className={`flex items-center gap-4 p-3 rounded-2xl transition-all border ${
                isActive
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                  : "bg-white/5 border-white/5 hover:border-white/20 text-white/40 hover:text-white"
              }`}
            >
              <div className="relative w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-[#121212]">
                <img
                  src={poster || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iqITmI6.png"}
                  alt={episode.title || `Episode ${episode.number}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{episode.number}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-sm font-medium truncate">
                  {episode.title || `Episode ${episode.number}`}
                </span>
                <span className="text-[10px] text-white/30 font-medium">
                  Episode {episode.number}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  const renderMobileSheet = () => (
    <AnimatePresence>
      {showEpisodesSheet && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEpisodesSheet(false)}
            className="fixed inset-0 bg-black z-[9998] backdrop-blur-xs md:hidden"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#0c0c0c] border-t border-white/10 rounded-t-3xl max-h-[75vh] flex flex-col overflow-hidden md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
          >
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
  );

  // Return Standard vs Theater Mode Layouts
  if (!isTheaterMode) {
    return (
      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Left Column: Player & Details */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {renderBackButton()}
          {renderAudioSwitcher()}
          {renderPlayer()}
          {renderMobileSheetTrigger()}
          {renderInfoDetails()}
        </div>

        {/* Right Column: Episodes Sidebar */}
        {renderSidebar()}

        {/* Mobile slide-up sheet */}
        {renderMobileSheet()}
      </div>
    );
  }

  // Widescreen Theater layout
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top: Widescreen Video Player */}
      <div className="w-full flex flex-col gap-6">
        {renderBackButton()}
        {renderAudioSwitcher()}
        {renderPlayer()}
        {renderMobileSheetTrigger()}
      </div>

      {/* Bottom: Info and Sidebar side-by-side */}
      <div className="flex flex-col lg:flex-row gap-8 w-full">
        <div className="flex-1 min-w-0">
          {renderInfoDetails()}
        </div>
        {renderSidebar()}
      </div>

      {/* Mobile slide-up sheet */}
      {renderMobileSheet()}
    </div>
  );
}