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

  const groupedServers = useMemo(() => {
    const dub: ServerEntry[] = [];
    const other: ServerEntry[] = [];
    for (const server of allServers) {
      if (server.kind === "dub") dub.push(server);
      else other.push(server);
    }
    return { dub, other };
  }, [allServers]);

  useEffect(() => {
    setCurrentVideoUrl(videoUrl);

    const preferredGroup = groupedServers.other.length > 0 ? "other" : "dub";
    const preferredServer = (preferredGroup === "other" ? groupedServers.other : groupedServers.dub)[0] || allServers[0];
    if (preferredServer) {
      setCurrentVideoUrl(preferredServer.url);
    }
  }, [videoUrl, groupedServers.dub, groupedServers.other, allServers]);

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full rounded-3xl overflow-hidden bg-black border border-white/5 shadow-2xl relative group/player">
        {currentVideoUrl ? (
          <PlayerWrapper
            videoUrl={currentVideoUrl}
            title={title}
            episodeTitle={episodeTitle}
            poster={poster}
            allServers={allServers}
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