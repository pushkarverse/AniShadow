
import { useEffect, useMemo, useState } from "react";
import { PlayerWrapper } from "@/components/PlayerWrapper";
import { List, X, ChevronLeft, Radio, Square, CheckSquare, Lightbulb, Bookmark } from "lucide-react";
import Link from "@/compat/Link";
import { useRouter } from "@/compat/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface ServerEntry {
  name: string;
  provider: string;
  url: string;
  kind?: "dub" | "hsub" | "sub" | "other";
  label?: string;
}

interface EpisodeEntry {
  id: string;
  number: number;
  title?: string;
  image?: string;
  isUnaired?: boolean;
  timeUntilAiring?: number;
  airingAt?: number;
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


function CountdownDisplay({ airingAt }: { airingAt: number }) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    if (!airingAt) return;

    const target = airingAt * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }

      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60)
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [airingAt]);

  if (!timeLeft) return null;

  return (
    <div className="flex gap-4 items-center justify-center">
      <div className="flex flex-col items-center p-3 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md min-w-[70px]">
        <span className="text-3xl font-black text-primary font-mono">{String(timeLeft.d).padStart(2, "0")}</span>
        <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold mt-1">Days</span>
      </div>
      <div className="flex flex-col items-center p-3 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md min-w-[70px]">
        <span className="text-3xl font-black text-white font-mono">{String(timeLeft.h).padStart(2, "0")}</span>
        <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold mt-1">Hours</span>
      </div>
      <div className="flex flex-col items-center p-3 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md min-w-[70px]">
        <span className="text-3xl font-black text-white font-mono">{String(timeLeft.m).padStart(2, "0")}</span>
        <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold mt-1">Mins</span>
      </div>
      <div className="flex flex-col items-center p-3 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md min-w-[70px]">
        <span className="text-3xl font-black text-white font-mono">{String(timeLeft.s).padStart(2, "0")}</span>
        <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold mt-1">Secs</span>
      </div>
    </div>
  );
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
  const router = useRouter();
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);
  const [selectedServer, setSelectedServer] = useState(allServers[0]?.name || "Primary");
  const [activeServerGroup, setActiveServerGroup] = useState<"dub" | "hsub" | "sub" | "other">("sub");
  const [showEpisodesSheet, setShowEpisodesSheet] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [episodeSearch, setEpisodeSearch] = useState<string>("");
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [activeMobileSeason, setActiveMobileSeason] = useState(0);

  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isAutoNext, setIsAutoNext] = useState(true);
  const [isAutoSkip, setIsAutoSkip] = useState(false);

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
    const hsub: ServerEntry[] = [];
    const sub: ServerEntry[] = [];
    const other: ServerEntry[] = [];

    for (const server of allServers) {
      const isDub = server.kind === "dub" || /dub|dual audio|multi audio/i.test(`${server.label || ""} ${server.name}`);
      const isHsub = server.kind === "hsub" || /hsub|hardsub|\bhs\b/i.test(`${server.label || ""} ${server.name}`);
      const isSub = server.kind === "sub" || /sub|softsub|raw/i.test(`${server.label || ""} ${server.name}`);
      
      if (isDub) {
        dub.push(server);
      } else if (isHsub) {
        hsub.push(server);
      } else if (isSub) {
        sub.push(server);
      } else {
        other.push(server);
      }
    }

    return { dub, hsub, sub, other };
  }, [allServers]);

  const activeGroupServers = activeServerGroup === "dub" ? groupedServers.dub : activeServerGroup === "hsub" ? groupedServers.hsub : activeServerGroup === "sub" ? groupedServers.sub : groupedServers.other;
  const activeServerLabel = activeServerGroup === "dub" ? "English Dub" : activeServerGroup === "hsub" ? "Hardsub" : "Sub";

  useEffect(() => {
    setCurrentVideoUrl(videoUrl);

    const preferredGroup = groupedServers.sub.length > 0 ? "sub" : groupedServers.hsub.length > 0 ? "hsub" : groupedServers.other.length > 0 ? "other" : "dub";
    setActiveServerGroup(preferredGroup);

    const preferredServer = (
      preferredGroup === "sub" ? groupedServers.sub :
      preferredGroup === "hsub" ? groupedServers.hsub :
      preferredGroup === "other" ? groupedServers.other :
      groupedServers.dub
    )[0] || allServers[0];
    
    if (preferredServer) {
      setSelectedServer(preferredServer.name);
      setCurrentVideoUrl(preferredServer.url);
    }
  }, [videoUrl, groupedServers.dub, groupedServers.hsub, groupedServers.sub, groupedServers.other, allServers]);

  const switchGroup = (kind: "dub" | "hsub" | "sub" | "other") => {
    setActiveServerGroup(kind);
    const nextServer = (
      kind === "dub" ? groupedServers.dub :
      kind === "hsub" ? groupedServers.hsub :
      kind === "sub" ? groupedServers.sub :
      groupedServers.other
    )[0];
    if (!nextServer) return;
    setSelectedServer(nextServer.name);
    setCurrentVideoUrl(nextServer.url);
  };

  const renderBackButton = () => (
    <Link
      href={`/anime/${animeId}/${animeSlug}`}
      className="hidden md:inline-flex items-center gap-2 text-white/40 hover:text-primary transition-all mb-1 group font-black uppercase tracking-widest text-[10px]"
    >
      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
      <span>Back to Series</span>
    </Link>
  );

  const renderAudioSwitcher = () => {
    const renderProviderGroup = (kind: "dub" | "hsub" | "sub" | "other", label: string, servers: ServerEntry[], icon: React.ReactNode) => {
      if (servers.length === 0) return (
        <div className="flex flex-col gap-4 py-4 px-4 h-full">
          <div className="flex items-center gap-2 text-white/30 bg-white/5 py-2 px-3 rounded-lg w-fit">
            {icon}
            <span className="text-xs font-black uppercase tracking-widest">{label}</span>
          </div>
          <div className="py-2 text-white/30 text-sm font-medium">No providers available</div>
        </div>
      );
      
      return (
        <div className="flex flex-col gap-4 py-4 px-4 h-full">
          <div className="flex items-center gap-2 text-white/60 bg-white/5 py-2 px-3 rounded-lg w-fit">
            {icon}
            <span className="text-xs font-black uppercase tracking-widest">{label}</span>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            {servers.map((server) => {
              const isSelected = currentVideoUrl === server.url && activeServerGroup === kind;
              return (
                <button
                  key={`${server.url}-${server.name}`}
                  type="button"
                  onClick={() => {
                    setActiveServerGroup(kind);
                    setSelectedServer(server.name);
                    setCurrentVideoUrl(server.url);
                  }}
                  className={`flex items-center justify-between gap-2 rounded-lg px-4 py-3 transition-all ${
                    isSelected
                      ? "bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.3)] font-bold"
                      : "bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white font-semibold"
                  }`}
                  title={`${server.provider} provider`}
                >
                  <span className="text-xs tracking-tight">{server.name}</span>
                  <div className={`w-3 h-3 rounded-full flex items-center justify-center border-2 shrink-0 ${isSelected ? "border-white bg-white/20" : "border-white/40"}`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <section className="px-4 md:px-0 mt-2" aria-label="Providers">
        <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
            {renderProviderGroup("sub", "SUB", groupedServers.sub, (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="7" width="20" height="10" rx="2" ry="2"></rect><path d="M7 11h2"></path><path d="M15 11h2"></path></svg>
            ))}
            {renderProviderGroup("hsub", "HSUB", groupedServers.hsub, (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="7" width="20" height="10" rx="2" ry="2"></rect><path d="M7 11h2"></path><path d="M15 11h2"></path></svg>
            ))}
            {renderProviderGroup("dub", "DUB", groupedServers.dub, (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
            ))}
          </div>
          {groupedServers.other.length > 0 && (
            <div className="border-t border-white/10 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
              {renderProviderGroup("other", "OTHER", groupedServers.other, (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderPlayer = () => {
    const currentEpisodeObj = episodes.find(e => e.number === currentEpisodeNumber);
    const isUnaired = currentEpisodeObj?.isUnaired;

    return (
      <div className="w-full md:rounded-3xl overflow-hidden bg-black md:border border-white/5 shadow-2xl relative group/player">
        {isUnaired ? (
          <div className="aspect-video relative flex flex-col items-center justify-center bg-[#080808] overflow-hidden">
            {poster && (
              <div
                className="absolute inset-0 bg-cover bg-center blur-[80px] opacity-30 scale-110"
                style={{ backgroundImage: `url(${poster})` }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center justify-center gap-6 text-center px-8 w-full max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                  Episode {currentEpisodeObj?.number} Premiering Soon
                </span>
              </div>

              <h3 className="text-2xl md:text-4xl font-black text-white tracking-tight drop-shadow-xl">
                {title}
              </h3>

              <div className="mt-4">
                <CountdownDisplay airingAt={currentEpisodeObj?.airingAt || 0} />
              </div>
            </div>
          </div>
        ) : currentVideoUrl ? (
          <PlayerWrapper
            videoUrl={currentVideoUrl}
            title={title}
            episodeTitle={episodeTitle}
            poster={poster}
            allServers={allServers}
            isTheaterMode={isTheaterMode}
            onTheaterToggle={handleTheaterToggle}
            autoPlay={isAutoPlay}
            onEnded={() => {
              if (isAutoNext) {
                const nextEp = episodes.find(e => e.number === (currentEpisodeNumber || 0) + 1);
                if (nextEp) {
                  router.push(`/anime/watch/${animeId}/${animeSlug}?ep=${nextEp.number}`);
                }
              }
            }}
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
  };

  const renderControlsBar = () => (
    <div className="flex flex-wrap items-center justify-center gap-6 px-4 py-4 md:px-0">
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 w-full md:w-auto overflow-x-auto">
        <button 
          onClick={() => setIsAutoPlay(!isAutoPlay)}
          className={`flex items-center gap-2 text-sm font-semibold transition-colors shrink-0 ${isAutoPlay ? 'text-primary' : 'text-white/60 hover:text-white'}`}
        >
          {isAutoPlay ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          Auto Play
        </button>
        <button 
          onClick={() => setIsAutoNext(!isAutoNext)}
          className={`flex items-center gap-2 text-sm font-semibold transition-colors shrink-0 ${isAutoNext ? 'text-primary' : 'text-white/60 hover:text-white'}`}
        >
          {isAutoNext ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          Auto Next
        </button>
        <button 
          onClick={() => setIsAutoSkip(!isAutoSkip)}
          className={`flex items-center gap-2 text-sm font-semibold transition-colors shrink-0 ${isAutoSkip ? 'text-primary' : 'text-white/60 hover:text-white'}`}
        >
          {isAutoSkip ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          Auto Skip
        </button>
        
        <div className="w-px h-5 bg-white/10 hidden md:block shrink-0" />
        
        <button 
          onClick={handleTheaterToggle}
          className={`flex items-center gap-2 text-sm font-semibold transition-colors shrink-0 ${isTheaterMode ? 'text-yellow-400' : 'text-white/60 hover:text-white'}`}
        >
          <Lightbulb className="w-4 h-4" />
          Theater Mode
        </button>
        <button 
          className="flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white transition-colors shrink-0"
        >
          <Bookmark className="w-4 h-4" />
          Add Bookmark
        </button>
      </div>
    </div>
  );

  const renderMobileEpisodesSection = () => {
    if (!episodes || episodes.length === 0) return null;

    const q = episodeSearch.toLowerCase();
    const filteredEps = episodeSearch
      ? episodes.filter((ep) => {
        const t = (ep.title || `Episode ${ep.number}`).toLowerCase();
        return t.includes(q) || ep.number.toString() === episodeSearch;
      })
      : episodes;

    return (
      <div className="md:hidden flex flex-col gap-4 px-4 pb-4">
        {/* Heading */}
        <h2 className="text-xl font-black text-white tracking-tight">Episodes</h2>

        {/* Search bar */}
        <div className="relative">
          <input
            value={episodeSearch}
            onChange={(e) => setEpisodeSearch(e.target.value)}
            placeholder="Search episodes…"
            className="w-full bg-white/5 text-white/80 placeholder-white/30 px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-primary/50 text-sm transition-all"
          />
          {episodeSearch && (
            <button
              onClick={() => setEpisodeSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-all text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Episode List */}
        <div className="flex flex-col">
          {filteredEps.map((episode) => {
            const isActive = episode.number === currentEpisodeNumber;
            const targetUrl = `/anime/watch/${animeId}/${animeSlug}?ep=${episode.number}`;

            return (
              <Link
                key={episode.id}
                href={targetUrl}
                className={`flex items-center gap-3 py-3 border-b border-white/5 transition-all ${isActive ? "opacity-100" : "opacity-70 hover:opacity-100"
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
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isActive ? "bg-primary" : "bg-white/20"
                      }`}>
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white ml-0.5" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-white/80"
                    }`}>
                    {episode.title || `Episode ${episode.number}`}
                  </span>
                  <span className="text-[11px] text-white/40 font-medium">
                    Episode {episode.number}
                  </span>
                </div>
              </Link>
            );
          })}
          {filteredEps.length === 0 && (
            <p className="text-white/30 text-sm py-6 text-center">No episodes found</p>
          )}
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
                className={`flex items-center gap-4 p-3 rounded-2xl transition-all border ${isActive
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
                        className={`flex items-center gap-4 p-3 rounded-2xl transition-all border ${isActive
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
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {renderBackButton()}
          {renderPlayer()}
          {renderControlsBar()}
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
      <div className="w-full flex flex-col gap-4">
        {renderBackButton()}
        {renderPlayer()}
        {renderControlsBar()}
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