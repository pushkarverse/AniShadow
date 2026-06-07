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
  anime?: any;
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
  animeSlug,
  anime
}: WatchPlayerSectionProps) {
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);
  const [selectedServer, setSelectedServer] = useState(allServers[0]?.name || "Primary");
  const [activeServerGroup, setActiveServerGroup] = useState<"dub" | "other">("other");
  const [showEpisodesSheet, setShowEpisodesSheet] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [episodeSearch, setEpisodeSearch] = useState<string>("");
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [activeMobileSeason, setActiveMobileSeason] = useState(0);

  // Load theater mode preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("theaterMode");
    if (saved === "true") {
      setIsTheaterMode(true);
    }
  }, []);


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

  const renderMobileEpisodesSection = () => {
    if (!episodes || episodes.length === 0) return null;

    // Group episodes into season-sized chunks (12 per season)
    const SEASON_SIZE = 13;
    const totalSeasons = Math.ceil(episodes.length / SEASON_SIZE);
    const seasons = Array.from({ length: totalSeasons }, (_, i) =>
      episodes.slice(i * SEASON_SIZE, (i + 1) * SEASON_SIZE)
    );
    const currentSeasonEps = seasons[activeMobileSeason] || [];

    return (
      <div className="md:hidden flex flex-col gap-4 px-4 pb-4">
        {/* Heading */}
        <h2 className="text-xl font-black text-white tracking-tight">Episodes</h2>

        {/* Season Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-none pb-1">
          {seasons.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveMobileSeason(i)}
              className={`text-sm font-bold shrink-0 pb-1 border-b-2 transition-all cursor-pointer ${
                activeMobileSeason === i
                  ? "border-white text-white"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              Season {i + 1}
            </button>
          ))}
        </div>

        {/* Episode List */}
        <div className="flex flex-col">
          {currentSeasonEps.map((episode) => {
            const isActive = episode.number === currentEpisodeNumber;
            const targetUrl = `/anime/watch/${animeId}/${animeSlug}?ep=${episode.number}`;
            const seasonNum = activeMobileSeason + 1;
            const epInSeason = episode.number - activeMobileSeason * SEASON_SIZE;

            return (
              <Link
                key={episode.id}
                href={targetUrl}
                className={`flex items-center gap-3 py-3 border-b border-white/5 transition-all ${
                  isActive ? "opacity-100" : "opacity-70 hover:opacity-100"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative w-28 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-black">
                  <img
                    src={episode.image || poster || ""}
                    alt={episode.title || `Episode ${episode.number}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Play icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      isActive ? "bg-primary" : "bg-white/20"
                    }`}>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white ml-0.5" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className={`text-sm font-semibold truncate ${
                    isActive ? "text-white" : "text-white/80"
                  }`}>
                    {episode.title || `Episode ${episode.number}`}
                  </span>
                  <span className="text-[11px] text-white/40 font-medium">
                    S{seasonNum} E{epInSeason}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMobileSheetTrigger = () =>
    episodes.length > 0 && (
      <div className="hidden">
        <button
          onClick={() => setShowEpisodesSheet(true)}
          className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-[0.98] cursor-pointer"
        >
          <List className="w-4 h-4 text-primary" />
          <span>Select Episode ({currentEpisodeNumber} / {episodes.length})</span>
        </button>
      </div>
    );

  const formatDate = (date: any) => {
    if (!date || !date.year) return null;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStr = date.month ? months[date.month - 1] : '';
    const dayStr = date.day ? ` ${date.day},` : '';
    return `${monthStr}${dayStr} ${date.year}`.trim();
  };

  const getAiredDateString = () => {
    const start = formatDate(anime?.startDate);
    const end = formatDate(anime?.endDate);
    if (start && end) return `${start} to ${end}`;
    if (start) return `${start}`;
    return "Unknown";
  };

  const formatStatus = (status: string) => {
    if (!status) return "Unknown";
    return status.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const cleanDescription = (anime?.description || description || "No description available.").replace(/<[^>]*>?/gm, '');

  const renderInfoDetails = () => (
    <div className="px-4 md:px-0 flex flex-col md:flex-row items-center md:items-start gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-md">
      {/* Left Column: Poster Image */}
      <div className="w-36 md:w-44 shrink-0 rounded-2xl overflow-hidden aspect-[2/3] relative border border-white/10 shadow-lg bg-black/40 self-center md:self-start">
        <img
          src={anime?.image || poster || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iqITmI6.png"}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right Column: Title, Subtitle, Description, Metadata */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            {title}
          </h2>
          {anime?.title && (
            <p className="text-xs text-white/40 italic font-medium mt-1">
              {typeof anime.title === 'object' 
                ? (anime.title.romaji || anime.title.native) 
                : anime.title}
            </p>
          )}
          
          <p className="text-white/65 text-sm leading-relaxed mt-4 font-medium">
            {isDescExpanded ? cleanDescription : (cleanDescription.length > 220 ? `${cleanDescription.slice(0, 220)}...` : cleanDescription)}
            {cleanDescription.length > 220 && (
              <button 
                onClick={() => setIsDescExpanded(!isDescExpanded)} 
                className="text-primary hover:text-white ml-2 font-black uppercase tracking-widest text-[10px] transition-colors cursor-pointer"
              >
                {isDescExpanded ? " -less" : " +more"}
              </button>
            )}
          </p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-6 pt-6 border-t border-white/5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white/30 uppercase tracking-widest min-w-[100px]">Type:</span>
            <span className="text-white/85 font-semibold">{anime?.type || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white/30 uppercase tracking-widest min-w-[100px]">Premiered:</span>
            <span className="text-white/85 font-semibold capitalize">{anime?.season && anime?.seasonYear ? `${anime.season} ${anime.seasonYear}`.toLowerCase() : "Unknown"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white/30 uppercase tracking-widest min-w-[100px]">Date aired:</span>
            <span className="text-white/85 font-semibold">{getAiredDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white/30 uppercase tracking-widest min-w-[100px]">Duration:</span>
            <span className="text-white/85 font-semibold">{anime?.duration ? `${anime.duration} min` : "Unknown"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white/30 uppercase tracking-widest min-w-[100px]">Status:</span>
            <span className="text-white/85 font-semibold">{formatStatus(anime?.status)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white/30 uppercase tracking-widest min-w-[100px]">Episodes:</span>
            <span className="text-white/85 font-semibold">{anime?.totalEpisodes || anime?.episodes?.length || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white/30 uppercase tracking-widest min-w-[100px]">Genres:</span>
            <span className="text-white/85 font-semibold line-clamp-1">{anime?.genres?.join(', ') || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white/30 uppercase tracking-widest min-w-[100px]">Scores:</span>
            <span className="text-white/85 font-semibold">{anime?.rating ? `${(anime.rating / 10).toFixed(1)} / 10` : "N/A"}</span>
          </div>
          <div className="flex items-start gap-2 col-span-1 sm:col-span-2">
            <span className="font-bold text-white/30 uppercase tracking-widest min-w-[100px] mt-0.5">Studios:</span>
            <span className="text-white/85 font-semibold">
              {anime?.studios?.filter((s: any) => s.isMain).map((s: any) => s.name).join(', ') || "Unknown"}
            </span>
          </div>
          <div className="flex items-start gap-2 col-span-1 sm:col-span-2">
            <span className="font-bold text-white/30 uppercase tracking-widest min-w-[100px] mt-0.5">Producers:</span>
            <span className="text-white/85 font-semibold">
              {anime?.studios?.filter((s: any) => !s.isMain).map((s: any) => s.name).join(', ') || "Unknown"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSidebar = () => (
    <div className="hidden lg:flex w-full lg:w-80 flex-col gap-4 shrink-0">
      <h3 className="text-lg font-semibold px-2">Episodes</h3>
      <div className="px-2">
        <div className="relative">
          <input
            value={episodeSearch}
            onChange={(e) => setEpisodeSearch(e.target.value)}
            placeholder="Search episodes..."
            className="w-full bg-white/5 text-white/70 placeholder-white/40 px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {episodes
          .filter((ep) => {
            if (!episodeSearch) return true;
            const q = episodeSearch.toLowerCase();
            const title = (ep.title || `Episode ${ep.number}`).toString().toLowerCase();
            return title.includes(q) || ep.number.toString() === q;
          })
          .map((episode) => {
          const isActive = episode.number === currentEpisodeNumber;
          const targetUrl = `/anime/watch/${animeId}/${animeSlug}?ep=${episode.number}`;

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
            className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl max-h-[75vh] flex flex-col overflow-hidden md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
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
              <div className="mb-3 px-2">
                <input
                  value={episodeSearch}
                  onChange={(e) => setEpisodeSearch(e.target.value)}
                  placeholder="Search episodes..."
                  className="w-full bg-white/5 text-white/70 placeholder-white/40 px-3 py-2 rounded-lg border border-white/5 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {episodes
                  .filter((ep) => {
                    if (!episodeSearch) return true;
                    const q = episodeSearch.toLowerCase();
                    const title = (ep.title || `Episode ${ep.number}`).toString().toLowerCase();
                    return title.includes(q) || ep.number.toString() === q;
                  })
                  .map((episode) => {
                  const isActive = episode.number === currentEpisodeNumber;
                  const targetUrl = `/anime/watch/${animeId}/${animeSlug}?ep=${episode.number}`;

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
          {renderPlayer()}
          {renderAudioSwitcher()}
          {renderMobileEpisodesSection()}
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
        {renderPlayer()}
        {renderAudioSwitcher()}
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