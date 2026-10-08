
import { Suspense, lazy } from "react";

interface ServerEntry {
  name: string;
  provider: string;
  url: string;
  kind?: "sub" | "hsub" | "dub" | "other";
  label?: string;
}

const VideoPlayer = lazy(() =>
  import("./VideoPlayer").then((mod) => ({ default: mod.VideoPlayer }))
);

const PlayerFallback = () => (
  <div className="w-full aspect-video bg-black/40 animate-pulse rounded-2xl flex items-center justify-center text-white/40 border border-white/5">
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-sm font-medium">Initializing Player...</span>
    </div>
  </div>
);

interface PlayerWrapperProps {
  videoUrl: string;
  title: string;
  episodeTitle: string;
  poster?: string;
  allServers?: ServerEntry[];
  isTheaterMode?: boolean;
  onTheaterToggle?: () => void;
  autoPlay?: boolean;
  onEnded?: () => void;
}

export function PlayerWrapper(props: PlayerWrapperProps) {
  return (
    <Suspense fallback={<PlayerFallback />}>
      <VideoPlayer {...props} />
    </Suspense>
  );
}
