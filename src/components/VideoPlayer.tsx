"use client";

import { useState, useRef, useEffect, ReactElement, useMemo } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw, Settings, Subtitles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Hls from "hls.js";

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  episodeTitle: string;
  poster?: string;
}

function unpackDeanEdwards(html: string): string | null {
  const packedRegex = /eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*[r|d]\s*\)\s*\{[\s\S]*?return\s+p\s*\}\s*\(\s*['"]([\s\S]*?)['"]\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*['"]([\s\S]*?)['"]\.split\s*\(\s*['"]\|['"]\s*\)/i;
  const match = html.match(packedRegex);
  if (!match) return null;
  
  let p = match[1];
  const a = parseInt(match[2]);
  const c = parseInt(match[3]);
  const k = match[4].split('|');
  
  let count = c;
  while (count--) {
    if (k[count]) {
      const baseN = count.toString(a);
      const reg = new RegExp('\\b' + baseN + '\\b', 'g');
      p = p.replace(reg, k[count]);
    }
  }
  return p;
}


/**
 * Modern Anime Player with HLS support and Proxy integration
 */
export function VideoPlayer({ 
  videoUrl: initialVideoUrl, 
  title, 
  episodeTitle, 
  poster,
}: VideoPlayerProps): ReactElement {
  const [currentVideoUrl, setCurrentVideoUrl] = useState(initialVideoUrl);
  const [isExtracting, setIsExtracting] = useState(false);

  const isIframe = useMemo(() => {
    if (!currentVideoUrl) return false;
    const urlLower = currentVideoUrl.toLowerCase();
    if (urlLower.includes('.m3u8') || urlLower.includes('.mp4') || urlLower.includes('.mkv')) {
      return false;
    }
    if (
      urlLower.includes('vibeplayer.site') ||
      urlLower.includes('otakuhg.site') ||
      urlLower.includes('otakuvid.online') ||
      urlLower.includes('playmogo.com') ||
      urlLower.includes('embed') ||
      urlLower.includes('/e/') ||
      urlLower.includes('player')
    ) {
      return true;
    }
    return currentVideoUrl.startsWith('http');
  }, [currentVideoUrl]);
  
  // Update internal URL or extract direct stream if it's an embed provider
  useEffect(() => {
    if (!initialVideoUrl) return;

    const urlLower = initialVideoUrl.toLowerCase();
    const isVibe = urlLower.includes("vibeplayer.site");
    const isOtakuHg = urlLower.includes("otakuhg.site");
    const isOtakuVid = urlLower.includes("otakuvid.online");

    if (!isVibe && !isOtakuHg && !isOtakuVid) {
      setCurrentVideoUrl(initialVideoUrl);
      setIsExtracting(false);
      return;
    }

    let active = true;
    setIsExtracting(true);

    const extract = async () => {
      try {
        const proxyUrl = `/api/stream?url=${encodeURIComponent(initialVideoUrl)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) {
          if (active) {
            setCurrentVideoUrl(initialVideoUrl);
            setIsExtracting(false);
          }
          return;
        }
        const html = await res.text();
        if (!active) return;

        let m3u8Url: string | null = null;
        if (isVibe) {
          const m3u8Matches = html.match(/https?:\/\/[^"'\s>]+\.m3u8[^"'\s>]*/gi);
          if (m3u8Matches && m3u8Matches.length > 0) {
            m3u8Url = m3u8Matches[0];
          }
        } else if (isOtakuHg || isOtakuVid) {
          const unpacked = unpackDeanEdwards(html);
          if (unpacked) {
            const m3u8Matches = unpacked.match(/https?:\/\/[^"'\s>]+\.m3u8[^"'\s>]*/gi);
            if (m3u8Matches && m3u8Matches.length > 0) {
              m3u8Url = m3u8Matches[0];
            }
          }
        }

        if (m3u8Url) {
          setCurrentVideoUrl(m3u8Url);
        } else {
          setCurrentVideoUrl(initialVideoUrl);
        }
      } catch (err) {
        console.error("Client-side extraction error:", err);
        if (active) setCurrentVideoUrl(initialVideoUrl);
      } finally {
        if (active) setIsExtracting(false);
      }
    };

    extract();

    return () => {
      active = false;
    };
  }, [initialVideoUrl]);


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

  // Subtitles & Quality States
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [isSubtitlesOn, setIsSubtitlesOn] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);

  const getSubtitleUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const sub = urlObj.searchParams.get("sub") || 
                  urlObj.searchParams.get("caption_1") || 
                  urlObj.searchParams.get("c1_file");
      return sub;
    } catch {
      return null;
    }
  };

  const proxiedSubtitleUrl = useMemo(() => {
    const sub = getSubtitleUrl(initialVideoUrl);
    if (!sub) return "";
    return `/api/stream?url=${encodeURIComponent(sub)}`;
  }, [initialVideoUrl]);

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

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
    }
  };

  const selectQuality = (levelId: number) => {
    if (hlsRef.current) {
      setIsBuffering(true);
      hlsRef.current.currentLevel = levelId;
      setCurrentLevel(levelId);
    }
    setShowQualityMenu(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard Shortcuts Effect
  useEffect(() => {
    const showControlsTemporarily = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
          if (isPlaying) setShowControls(false);
      }, 3000);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in inputs or contenteditable elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          showControlsTemporarily();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipBackward();
          showControlsTemporarily();
          break;
        case "ArrowRight":
          e.preventDefault();
          skipForward();
          showControlsTemporarily();
          break;
        case "ArrowUp":
          e.preventDefault();
          const newVolUp = Math.min(1, video.volume + 0.1);
          video.volume = newVolUp;
          if (video.muted) {
            video.muted = false;
            setIsMuted(false);
          }
          showControlsTemporarily();
          break;
        case "ArrowDown":
          e.preventDefault();
          const newVolDown = Math.max(0, video.volume - 0.1);
          video.volume = newVolDown;
          showControlsTemporarily();
          break;
        case "f":
        case "F":
          e.preventDefault();
          if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          showControlsTemporarily();
          break;
        case "m":
        case "M":
          e.preventDefault();
          video.muted = !video.muted;
          setIsMuted(video.muted);
          showControlsTemporarily();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying, duration, isFullscreen, isMuted]);

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
    if (target.includes("animeunity")) return "https://www.animeunity.tv/";
    if (target.includes("animesama")) return "https://anime-sama.me/";
    if (target.includes("streampeaker.org")) {
        return "https://animepahe.com/";
    }
    if (target.includes("vibeplayer.site")) return "https://vibeplayer.site/";
    if (target.includes("otakuhg.site")) return "https://otakuhg.site/";
    if (target.includes("otakuvid.online") || target.includes("dramiyos-cdn.com")) {
      return "https://otakuvid.online/";
    }
    return "";
  };

  const initialProxiedUrl = useMemo(() => {
    if (!currentVideoUrl) return "";
    const referer = getReferer(currentVideoUrl);
    return `/api/stream?url=${encodeURIComponent(currentVideoUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`;
  }, [currentVideoUrl]);

  // Clear levels when switching video sources
  useEffect(() => {
    setLevels([]);
    setCurrentLevel(-1);
    setShowQualityMenu(false);
    setIsBuffering(true);
  }, [initialVideoUrl]);

  useEffect(() => {
    setIsBuffering(true);
  }, [currentVideoUrl]);

  useEffect(() => {
    if (!currentVideoUrl) return;

    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
    }

    if (!useNative && Hls.isSupported() && (currentVideoUrl.includes("m3u8") || currentVideoUrl.includes(".m3u8"))) {
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

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            const parsedLevels = hls.levels.map((level, idx) => ({
              id: idx,
              name: level.name || (level.height ? `${level.height}p` : `Quality ${idx}`),
            }));
            setLevels([{ id: -1, name: "Auto" }, ...parsedLevels]);
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
                        setError("Playback failed. Please try a different server.");
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
  }, [currentVideoUrl, useNative, initialProxiedUrl]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full bg-black rounded-lg overflow-hidden group shadow-2xl transition-all ${isFullscreen ? 'rounded-none' : ''}`}
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
      <div className="relative w-full aspect-video">
      {(isExtracting || isBuffering) && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#080808]/85 backdrop-blur-md z-50">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary animate-spin" />
          </div>
        </div>
      )}
      {!hasInteracted && !isIframe && (
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
      {!isPlaying && hasInteracted && !isIframe && (
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

      {isIframe ? (
        <iframe
          src={currentVideoUrl}
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      ) : (
        <>
          <video
            ref={videoRef}
            crossOrigin="anonymous"
            playsInline
            className="absolute inset-0 w-full h-full object-contain"
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
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onSeeking={() => setIsBuffering(true)}
            onSeeked={() => setIsBuffering(false)}
            onCanPlay={() => setIsBuffering(false)}
            onLoadStart={() => setIsBuffering(true)}
          >
            {proxiedSubtitleUrl && isSubtitlesOn && (
              <track 
                src={proxiedSubtitleUrl} 
                kind="subtitles" 
                srcLang="en" 
                label="English" 
                default 
              />
            )}
          </video>

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
              <div className="bg-zinc-900/90 p-6 rounded-xl border border-white/10 text-center max-w-sm">
                <p className="text-white font-medium mb-4">{error}</p>
                <div className="flex gap-2 justify-center">
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-semibold"
                    >
                      Refresh
                    </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showControls && hasInteracted && !isIframe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/90 via-transparent to-black/60 p-4 md:p-6 pointer-events-none"
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
                <div className="flex items-center gap-3 sm:gap-6">
                  <button onClick={skipBackward} className="text-white hover:text-accent transition-all scale-110 active:scale-95" title="Rewind 10s">
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  <button onClick={togglePlay} className="text-white hover:text-accent transition-all scale-110 active:scale-95">
                    {isPlaying ? <Pause className="w-6 h-6 sm:w-7 h-7" /> : <Play className="w-6 h-6 sm:w-7 h-7 fill-current" />}
                  </button>

                  <button onClick={skipForward} className="text-white hover:text-accent transition-all scale-110 active:scale-95" title="Forward 10s">
                    <RotateCw className="w-5 h-5" />
                  </button>

                  <button onClick={() => {
                      if (videoRef.current) {
                          videoRef.current.muted = !isMuted;
                          setIsMuted(!isMuted);
                      }
                  }} className="text-white hover:text-accent transition-all hidden sm:inline-flex">
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  </button>
                </div>
                
                <div className="flex items-center gap-3 sm:gap-6 relative">
                  {proxiedSubtitleUrl && (
                    <button 
                      onClick={() => setIsSubtitlesOn(!isSubtitlesOn)} 
                      className={`transition-all ${isSubtitlesOn ? 'text-primary' : 'text-white/60 hover:text-white'}`}
                      title="Toggle Subtitles"
                    >
                      <Subtitles className="w-5 h-5 sm:w-6 h-6" />
                    </button>
                  )}

                  {levels.length > 1 && (
                    <div className="relative">
                      <button 
                        onClick={() => setShowQualityMenu(!showQualityMenu)} 
                        className="text-white hover:text-accent transition-all flex items-center gap-1"
                        title="Quality Settings"
                      >
                        <Settings className="w-5 h-5 sm:w-6 h-6" />
                        <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded uppercase">
                          {levels.find(l => l.id === currentLevel)?.name || "Auto"}
                        </span>
                      </button>

                      <AnimatePresence>
                        {showQualityMenu && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-10 right-0 bg-[#0c0c0c]/95 border border-white/10 rounded-xl p-2 w-32 flex flex-col gap-1 shadow-2xl backdrop-blur-md z-50 pointer-events-auto"
                          >
                            {levels.map((level) => (
                              <button
                                key={level.id}
                                onClick={() => selectQuality(level.id)}
                                className={`text-left text-xs px-3 py-2 rounded-lg font-medium transition-all ${
                                  currentLevel === level.id 
                                    ? "bg-primary text-white" 
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                {level.name}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <button onClick={() => {
                      if (!isFullscreen) {
                          containerRef.current?.requestFullscreen();
                      } else {
                          document.exitFullscreen();
                      }
                  }} className="text-white hover:text-accent transition-all">
                    <Maximize className="w-5 h-5 sm:w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
