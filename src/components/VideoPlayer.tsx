"use client";

import { useState, useRef, useEffect, ReactElement, useMemo } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Hls from "hls.js";

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  episodeTitle: string;
  poster?: string;
}

/**
 * Modern Anime Player with HLS support and Proxy integration
 */
export function VideoPlayer({ videoUrl, title, episodeTitle, poster }: VideoPlayerProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useNative, setUseNative] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const errorCountRef = useRef(0);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlay = async () => {
    if (!hasInteracted) setHasInteracted(true);
    if (videoRef.current) {
      if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
      } else {
          try {
              await videoRef.current.play();
              setIsPlaying(true);
          } catch (e: unknown) {
              if (e instanceof Error && e.name !== 'AbortError') {
                  console.error("Play error", e);
              }
          }
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const getReferer = (target: string) => {
    if (target.includes("owocdn") || target.includes("animepahe") || target.includes("kwik.cx") || target.includes("sakana.streampeaker.org")) {
        return "https://kwik.cx/";
    }
    if (target.includes("kaas") || target.includes("kickassanime")) {
        return "https://kaas.to/";
    }
    if (target.includes("tech20hub") || target.includes("animekai")) {
        return "https://animekai.to/";
    }
    if (target.includes("streampeaker.org")) {
        return "https://animepahe.com/";
    }
    return "";
  };

  const initialProxiedUrl = useMemo(() => {
    if (!videoUrl) return "";
    const referer = getReferer(videoUrl);
    return `/api/stream?url=${encodeURIComponent(videoUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`;
  }, [videoUrl]);

  useEffect(() => {
    if (!videoUrl) return;

    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
    }

    if (!useNative && Hls.isSupported() && (videoUrl.includes("m3u8") || videoUrl.includes(".m3u8"))) {
        const hls = new Hls({
            enableWorker: false, 
            lowLatencyMode: true,
            backBufferLength: 30,
            maxBufferLength: 30,
            fragLoadingMaxRetry: 50,
            levelLoadingMaxRetry: 50,

            xhrSetup: (xhr, url) => {
                if (!url.includes('/api/stream')) {
                    const referer = getReferer(url);
                    const proxiedUrl = `/api/stream?url=${encodeURIComponent(url)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`;
                    xhr.open('GET', proxiedUrl, true);
                }
            }
        });
        
        video.crossOrigin = "anonymous";
        hls.loadSource(initialProxiedUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_LOADED, () => {
            setError(null);
            errorCountRef.current = 0;
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.details === 'fragParsingError' || data.details === 'fragLoadError' || data.details === 'bufferAppendError') {
                 errorCountRef.current += 1;
                 
                 if (errorCountRef.current <= 30) {
                     hls.recoverMediaError();
                 } else {
                     setUseNative(true);
                     errorCountRef.current = 0;
                 }
            }

            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        hls.recoverMediaError();
                        break;
                    default:
                        console.error("Unrecoverable Error", data);
                        setError("Playback failed. Please try refreshing the page.");
                        hls.destroy();
                        break;
                }
            }
        });
    } else {
        video.src = initialProxiedUrl;
    }

    return () => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
    };
  }, [videoUrl, useNative, initialProxiedUrl]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-video bg-black rounded-lg overflow-hidden group shadow-2xl transition-all ${isFullscreen ? 'rounded-none' : ''}`}
      onMouseMove={() => {
          setShowControls(true);
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
          controlsTimeoutRef.current = setTimeout(() => {
              if (isPlaying) setShowControls(false);
          }, 3000);
      }}
      onMouseLeave={() => {
          if (isPlaying) setShowControls(false);
      }}
    >
      {/* Cinematic Thumbnail Preview Overlay */}
      {!hasInteracted && (
        <div 
          className="absolute inset-0 z-40 bg-[#080808] cursor-pointer group/preview overflow-hidden" 
          onClick={togglePlay}
        >
           {poster && (
             <img src={poster} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/preview:scale-105 group-hover/preview:opacity-50 transition-all duration-700" />
           )}
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px]">
             <motion.button 
               className="w-20 h-20 md:w-24 md:h-24 bg-primary/90 group-hover/preview:bg-primary group-hover/preview:scale-110 rounded-full flex items-center justify-center text-white shadow-[0_0_40px_rgba(220,38,38,0.5)] backdrop-blur-sm transition-all pointer-events-none"
             >
               <Play className="w-10 h-10 md:w-12 md:h-12 ml-2 fill-current" />
             </motion.button>
           </div>
        </div>
      )}

      {/* Big Center Play Button Overlay for Paused State */}
      {!isPlaying && hasInteracted && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/40 hover:bg-black/20 transition-colors cursor-pointer group/playbtn" 
          onClick={togglePlay}
        >
           <motion.button 
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.95 }}
             className="w-20 h-20 md:w-24 md:h-24 bg-primary/90 group-hover/playbtn:bg-primary rounded-full flex items-center justify-center text-white shadow-[0_0_40px_rgba(220,38,38,0.5)] backdrop-blur-sm transition-all pointer-events-none"
           >
             <Play className="w-10 h-10 md:w-12 md:h-12 ml-2 fill-current" />
           </motion.button>
        </div>
      )}

      <video
        ref={videoRef}
        crossOrigin="anonymous"
        className="w-full h-full object-contain"
        onTimeUpdate={() => {
            const time = videoRef.current?.currentTime || 0;
            setProgress(time);
            if (time > 5) localStorage.setItem(`anis-progress-${title}-${episodeTitle}`, time.toString());
        }}
        onLoadedMetadata={() => {
            setDuration(videoRef.current?.duration || 0);
            const saved = localStorage.getItem(`anis-progress-${title}-${episodeTitle}`);
            if (saved && videoRef.current) {
                videoRef.current.currentTime = parseFloat(saved);
            }
        }}
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
          <div className="bg-zinc-900/90 p-6 rounded-xl border border-white/10 text-center max-w-sm">
            <p className="text-white font-medium mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-semibold"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showControls && hasInteracted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/90 via-transparent to-black/60 p-6 pointer-events-none"
          >
            <div className="flex justify-between items-start">
              <div className="pointer-events-auto">
                <h2 className="text-white font-bold text-xl md:text-2xl drop-shadow-lg">{title}</h2>
                <p className="text-white/70 text-sm md:text-base">{episodeTitle}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 pointer-events-auto mt-auto">
              <div className="flex items-center gap-4">
                <span className="text-white/80 text-xs font-mono">{formatTime(progress)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={progress}
                  onChange={(e) => {
                      if (videoRef.current) videoRef.current.currentTime = Number(e.target.value);
                  }}
                  className="flex-1 h-1 appearance-none rounded-full cursor-pointer accent-primary hover:h-1.5 transition-all focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, rgb(220, 38, 38) ${(duration ? (progress / duration) * 100 : 0)}%, rgba(255, 255, 255, 0.2) ${(duration ? (progress / duration) * 100 : 0)}%)`
                  }}
                />
                <span className="text-white/80 text-xs font-mono">{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button onClick={togglePlay} className="text-white hover:text-accent transition-all scale-110 active:scale-95">
                    {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current" />}
                  </button>
                  <button onClick={() => {
                      if (videoRef.current) {
                          videoRef.current.muted = !isMuted;
                          setIsMuted(!isMuted);
                      }
                  }} className="text-white hover:text-accent transition-all">
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  </button>
                </div>
                
                <button onClick={() => {
                    if (!isFullscreen) {
                        containerRef.current?.requestFullscreen();
                    } else {
                        document.exitFullscreen();
                    }
                }} className="text-white hover:text-accent transition-all">
                  <Maximize className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
