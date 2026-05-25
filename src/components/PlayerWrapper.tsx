"use client";

import dynamic from "next/dynamic";

const VideoPlayer = dynamic(() => import("./VideoPlayer").then((mod) => mod.VideoPlayer), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-black/40 animate-pulse rounded-2xl flex items-center justify-center text-white/40 border border-white/5">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm font-medium">Initializing Player...</span>
      </div>
    </div>
  )
});

interface ServerEntry {
  name: string;
  provider: string;
  url: string;
  kind?: "dub" | "other";
  label?: string;
}

interface PlayerWrapperProps {
  videoUrl: string;
  title: string;
  episodeTitle: string;
  poster?: string;
  allServers?: ServerEntry[];
}

export function PlayerWrapper(props: PlayerWrapperProps) {
  return <VideoPlayer {...props} />;
}
