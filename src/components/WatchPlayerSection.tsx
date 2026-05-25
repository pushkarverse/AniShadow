"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayerWrapper } from "@/components/PlayerWrapper";

interface ServerEntry {
  name: string;
  provider: string;
  url: string;
  kind?: "dub" | "other";
  label?: string;
}

interface WatchPlayerSectionProps {
  videoUrl: string;
  title: string;
  episodeTitle: string;
  poster?: string;
  description?: string;
  allServers?: ServerEntry[];
}

export function WatchPlayerSection({
  videoUrl,
  title,
  episodeTitle,
  poster,
  description,
  allServers = []
}: WatchPlayerSectionProps) {
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);
  const [selectedServer, setSelectedServer] = useState(allServers[0]?.name || "Primary");
  const [activeServerGroup, setActiveServerGroup] = useState<"dub" | "other">("other");

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
    <div className="flex flex-col gap-4">
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

      <div className="w-full rounded-3xl overflow-hidden bg-black border border-white/5 shadow-2xl relative group/player">
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
  );
}