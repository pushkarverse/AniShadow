"use client";

import { useState, useRef, useEffect, ReactElement, useMemo } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw, Settings, Subtitles, Mic, Gauge, ChevronLeft, Sparkles, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Hls from "hls.js";
import { useRouter } from "next/navigation";

interface ServerEntry {
  name: string;
  provider: string;
  url: string;
  kind?: "dub" | "other";
  label?: string;
}

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  episodeTitle: string;
  poster?: string;
  allServers?: ServerEntry[];
  isTheaterMode?: boolean;
  onTheaterToggle?: () => void;
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
  allServers = [],
  isTheaterMode = false,
  onTheaterToggle,
}: VideoPlayerProps): ReactElement {
  const [currentVideoUrl, setCurrentVideoUrl] = useState(initialVideoUrl);
  const [isExtracting, setIsExtracting] = useState(false);

  // Audio group switching (Sub/Dub) inside the player
  const [activeAudioGroup, setActiveAudioGroup] = useState<"other" | "dub">("other");
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  const groupedServers = useMemo(() => {
    const dub: ServerEntry[] = [];
    const other: ServerEntry[] = [];
    for (const server of allServers) {
      if (server.kind === "dub") dub.push(server);
      else other.push(server);
    }
    return { dub, other };
  }, [allServers]);

  const hasBothAudioGroups = groupedServers.dub.length > 0 && groupedServers.other.length > 0;

  const switchAudioGroup = (kind: "other" | "dub") => {
    setActiveAudioGroup(kind);
    const nextServer = (kind === "dub" ? groupedServers.dub : groupedServers.other)[0];
    if (nextServer) {
      setCurrentVideoUrl(nextServer.url);
    }
    setShowAudioMenu(false);
  };

  // Responsive auto-hide delay
  const getControlsTimeout = () => typeof window !== 'undefined' && window.innerWidth < 768 ? 6000 : 4000;

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
  const lastTimeRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);

  // Reset playback timestamp when changing episodes
  useEffect(() => {
    lastTimeRef.current = 0;
    wasPlayingRef.current = false;
  }, [title, episodeTitle]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const [isCinemaGlow, setIsCinemaGlow] = useState(true);

  // Load Cinema Glow preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("cinemaGlow");
    if (saved === "false") {
      setIsCinemaGlow(false);
    }
  }, []);

  const toggleCinemaGlow = () => {
    setIsCinemaGlow((prev) => {
      const next = !prev;
      localStorage.setItem("cinemaGlow", String(next));
      return next;
    });
  };

  const glowCanvasRef = useRef<HTMLCanvasElement>(null);

  // Helper to draw a single frame onto the backlight canvas (pause seek updates)
  const drawGlowFrame = () => {
    const video = videoRef.current;
    const canvas = glowCanvasRef.current;
    if (!video || !canvas || isIframe || !isCinemaGlow) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } catch (err) {
      // Silently catch tainted canvas restrictions (CORS)
    }
  };

  // Real-time ambient glow backlight loop
  useEffect(() => {
    const video = videoRef.current;
    const canvas = glowCanvasRef.current;
    if (!video || !canvas || !isPlaying || !isCinemaGlow || isIframe) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    let animationFrameId: number;

    canvas.width = 32;
    canvas.height = 18;

    const renderLoop = () => {
      if (video.paused || video.ended) return;

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        // Silently catch tainted canvas restrictions (CORS)
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, isCinemaGlow, isIframe, currentVideoUrl]);

  const updateBuffered = () => {
    const video = videoRef.current;
    if (video && video.buffered.length > 0 && duration > 0) {
      const time = video.currentTime;
      let currentBufferEnd = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= time && time <= video.buffered.end(i)) {
          currentBufferEnd = video.buffered.end(i);
          break;
        }
      }
      if (currentBufferEnd === 0) {
        currentBufferEnd = video.buffered.end(0);
      }
      setBuffered(currentBufferEnd);
    }
  };
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useNative, setUseNative] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const errorCountRef = useRef(0);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const [brightness, setBrightness] = useState<number>(1);
  const [gestureHud, setGestureHud] = useState<{
    visible: boolean;
    type: "seek" | "volume" | "brightness";
    value: string;
    percentage?: number;
  }>({ visible: false, type: "seek", value: "" });

  const touchStartRef = useRef<{ x: number; y: number; time: number; volume: number; brightness: number } | null>(null);
  const isSwipingRef = useRef<"horizontal" | "vertical-left" | "vertical-right" | null>(null);
  const wasSwipingRef = useRef<boolean>(false);

  // Subtitles & Quality States
  const [levels, setLevels] = useState<{ id: number; name: string }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [isSubtitlesOn, setIsSubtitlesOn] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);

  // Sync playback speed when video URL or component changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [currentVideoUrl, playbackSpeed]);

  const [isScrubbing, _setIsScrubbing] = useState<boolean>(false);
  const isScrubbingRef = useRef<boolean>(false);
  const setIsScrubbing = (val: boolean) => {
    isScrubbingRef.current = val;
    _setIsScrubbing(val);
  };

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [previewVideoElement, setPreviewVideoElement] = useState<HTMLVideoElement | null>(null);
  const previewHlsRef = useRef<Hls | null>(null);

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * duration;
    setHoverTime(time);
    setHoverPosition(percentage * 100);
  };

  const handleProgressBarMouseLeave = () => {
    setHoverTime(null);
  };

  const scheduleControlsHide = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    const delay = typeof window !== 'undefined' && window.innerWidth < 768 ? 6000 : 4000;
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !isScrubbingRef.current) {
        setShowControls(false);
      }
    }, delay);
  };

  const [showSkipOverlay, setShowSkipOverlay] = useState<{
    visible: boolean;
    direction: "forward" | "backward";
    count: number;
  }>({ visible: false, direction: "forward", count: 0 });

  const lastTapRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipOverlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const triggerDoubleTapSeek = (direction: "forward" | "backward") => {
    if (videoRef.current) {
      const skipAmount = direction === "forward" ? 10 : -10;
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + skipAmount));
    }

    setShowSkipOverlay((prev) => {
      const nextCount = prev.direction === direction ? prev.count + 10 : 10;
      return {
        visible: true,
        direction,
        count: nextCount,
      };
    });

    if (skipOverlayTimeoutRef.current) clearTimeout(skipOverlayTimeoutRef.current);
    skipOverlayTimeoutRef.current = setTimeout(() => {
      setShowSkipOverlay({ visible: false, direction: "forward", count: 0 });
    }, 800);
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLElement>) => {
    if (wasSwipingRef.current) {
      wasSwipingRef.current = false;
      return;
    }

    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("a") ||
      target.closest("select") ||
      target.closest("iframe")
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;

      if (clickX < width * 0.45) {
        triggerDoubleTapSeek("backward");
      } else if (clickX > width * 0.55) {
        triggerDoubleTapSeek("forward");
      } else {
        togglePlay();
      }

      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Capture position now — synthetic event may be nullified after this handler returns
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      clickTimeoutRef.current = setTimeout(() => {
        const isCenter = clickX >= width * 0.33 && clickX <= width * 0.67;
        if (window.innerWidth < 768) {
          // Mobile: always toggle the control bar; play/pause only when center
          setShowControls((prev) => {
            const next = !prev;
            if (next) scheduleControlsHide();
            return next;
          });
          if (isCenter) togglePlay();
        } else {
          // Desktop: play/pause only when center; sides just reveal controls
          if (isCenter) {
            togglePlay();
          } else {
            setShowControls(true);
            scheduleControlsHide();
          }
        }
      }, DOUBLE_PRESS_DELAY);
    }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
        if (window.screen && (window.screen as any).orientation && (window.screen as any).orientation.lock) {
          await (window.screen as any).orientation.lock("landscape").catch(() => { });
        }
      } catch (err) {
        console.error("Error enabling fullscreen:", err);
      }
    } else {
      try {
        if (window.screen && (window.screen as any).orientation && (window.screen as any).orientation.unlock) {
          (window.screen as any).orientation.unlock();
        }
      } catch { }
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (skipOverlayTimeoutRef.current) clearTimeout(skipOverlayTimeoutRef.current);
    };
  }, []);

  // Auto-fullscreen on rotation for mobile viewports
  useEffect(() => {
    const handleOrientationChange = async (e: MediaQueryListEvent) => {
      const isMobileSize = window.innerWidth < 768 || window.innerHeight < 768;
      if (!isMobileSize || isIframe) return;

      if (e.matches) {
        if (!document.fullscreenElement && containerRef.current) {
          try {
            await containerRef.current.requestFullscreen();
            if (window.screen && (window.screen as any).orientation && (window.screen as any).orientation.lock) {
              await (window.screen as any).orientation.lock("landscape").catch(() => { });
            }
          } catch (err) {
            console.error("Auto-fullscreen on landscape failed:", err);
          }
        }
      } else {
        if (document.fullscreenElement) {
          try {
            if (window.screen && (window.screen as any).orientation && (window.screen as any).orientation.unlock) {
              (window.screen as any).orientation.unlock();
            }
          } catch { }
          await document.exitFullscreen().catch(() => { });
        }
      }
    };

    const mediaQueryList = window.matchMedia("(orientation: landscape)");
    mediaQueryList.addEventListener("change", handleOrientationChange);
    
    return () => {
      mediaQueryList.removeEventListener("change", handleOrientationChange);
    };
  }, [isIframe]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isIframe) return;
    const touch = e.touches[0];
    const video = videoRef.current;
    if (!video) return;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: video.currentTime,
      volume: video.volume,
      brightness: brightness
    };
    isSwipingRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isIframe || !touchStartRef.current) return;
    const touch = e.touches[0];
    const start = touchStartRef.current;
    const video = videoRef.current;
    if (!video) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const rect = e.currentTarget.getBoundingClientRect();

    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest(".no-swipe")) {
      return;
    }

    if (!isSwipingRef.current) {
      if (Math.abs(deltaX) > 15 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isSwipingRef.current = "horizontal";
        wasSwipingRef.current = true;
      } else if (Math.abs(deltaY) > 15 && Math.abs(deltaY) > Math.abs(deltaX)) {
        const startXFromLeft = start.x - rect.left;
        if (startXFromLeft < rect.width / 2) {
          isSwipingRef.current = "vertical-left";
        } else {
          isSwipingRef.current = "vertical-right";
        }
        wasSwipingRef.current = true;
      }
    }

    if (isSwipingRef.current === "horizontal") {
      e.preventDefault();
      const sensitivity = 300;
      const change = (deltaX / rect.width) * sensitivity;
      const newTime = Math.max(0, Math.min(duration, start.time + change));
      
      const diff = Math.round(newTime - start.time);
      const sign = diff >= 0 ? "+" : "";
      setGestureHud({
        visible: true,
        type: "seek",
        value: `${formatTime(newTime)} (${sign}${diff}s)`
      });
      video.currentTime = newTime;
    } else if (isSwipingRef.current === "vertical-left") {
      e.preventDefault();
      const change = -(deltaY / rect.height);
      const newBrightness = Math.max(0.1, Math.min(1, start.brightness + change));
      setBrightness(newBrightness);
      
      setGestureHud({
        visible: true,
        type: "brightness",
        value: `Brightness: ${Math.round(newBrightness * 100)}%`,
        percentage: newBrightness * 100
      });
    } else if (isSwipingRef.current === "vertical-right") {
      e.preventDefault();
      const change = -(deltaY / rect.height);
      const newVolume = Math.max(0, Math.min(1, start.volume + change));
      video.volume = newVolume;
      
      if (newVolume > 0 && isMuted) {
        video.muted = false;
        setIsMuted(false);
      } else if (newVolume === 0 && !isMuted) {
        video.muted = true;
        setIsMuted(true);
      }
      
      setGestureHud({
        visible: true,
        type: "volume",
        value: `Volume: ${Math.round(newVolume * 100)}%`,
        percentage: newVolume * 100
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    if (isSwipingRef.current) {
      setTimeout(() => {
        setGestureHud(prev => ({ ...prev, visible: false }));
      }, 500);
      isSwipingRef.current = null;
    }
  };

  // Keyboard Shortcuts Effect
  useEffect(() => {
    const showControlsTemporarily = () => {
      setShowControls(true);
      scheduleControlsHide();
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

  useEffect(() => {
    if (!previewVideoElement || !currentVideoUrl) return;

    if (previewHlsRef.current) {
      previewHlsRef.current.destroy();
      previewHlsRef.current = null;
    }

    if (!useNative && Hls.isSupported() && (currentVideoUrl.includes("m3u8") || currentVideoUrl.includes(".m3u8"))) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        maxBufferLength: 1,
        maxMaxBufferLength: 2,
        xhrSetup: (xhr, url) => {
          if (!url.includes('/api/stream')) {
            const referer = getReferer(url);
            const proxiedUrl = `/api/stream?url=${encodeURIComponent(url)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}`;
            xhr.open('GET', proxiedUrl, true);
          }
        }
      });
      hls.loadSource(initialProxiedUrl);
      hls.attachMedia(previewVideoElement);
      previewHlsRef.current = hls;
    } else {
      previewVideoElement.src = initialProxiedUrl;
    }

    return () => {
      if (previewHlsRef.current) {
        previewHlsRef.current.destroy();
        previewHlsRef.current = null;
      }
    };
  }, [previewVideoElement, currentVideoUrl, useNative, initialProxiedUrl]);

  useEffect(() => {
    if (previewVideoElement && hoverTime !== null) {
      previewVideoElement.currentTime = hoverTime;
    }
  }, [previewVideoElement, hoverTime]);

  // Clear levels when switching video sources
  useEffect(() => {
    setLevels([]);
    setCurrentLevel(-1);
    setShowQualityMenu(false);
    setIsBuffering(true);
    setBuffered(0);
  }, [initialVideoUrl]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: episodeTitle,
      album: 'AniShadow',
      artwork: poster
        ? [
          { src: poster, sizes: '512x512', type: 'image/jpeg' },
          { src: poster, sizes: '256x256', type: 'image/jpeg' },
          { src: poster, sizes: '96x96', type: 'image/jpeg' },
        ]
        : [],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      videoRef.current?.play();
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      videoRef.current?.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('seekbackward', () => skipBackward());
    navigator.mediaSession.setActionHandler('seekforward', () => skipForward());

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      }
    };
  }, [title, episodeTitle, poster]);

  useEffect(() => {
    setIsBuffering(true);
    setBuffered(0);
    setIsPlaying(false); // Reset playing state on source switch to avoid UI/state desync
    if (videoRef.current && !videoRef.current.paused) {
      wasPlayingRef.current = true;
    } else {
      wasPlayingRef.current = false;
    }
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

        if (videoRef.current) {
          if (lastTimeRef.current > 0) {
            videoRef.current.currentTime = lastTimeRef.current;
          }
          if (wasPlayingRef.current) {
            videoRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch((err) => {
              console.warn("HLS autoplay failed:", err);
            });
          }
        }
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
    <div className="relative w-full">
      {/* Real-time blurred ambient backlight glow canvas */}
      {isCinemaGlow && !isIframe && (
        <canvas
          ref={glowCanvasRef}
          className="absolute inset-0 w-full h-full scale-[1.08] blur-[80px] opacity-80 pointer-events-none z-0 transition-opacity duration-500"
          style={{
            transform: "scale(1.06, 1.10)",
          }}
        />
      )}

      <div
        ref={containerRef}
        className={`relative w-full bg-black rounded-lg overflow-hidden group shadow-2xl transition-all z-10 ${isFullscreen ? 'rounded-none' : ''}`}
        onMouseMove={() => {
          setShowControls(true);
          scheduleControlsHide();
        }}
        onMouseLeave={() => {
          if (videoRef.current && !videoRef.current.paused && !isScrubbingRef.current) {
            setShowControls(false);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      {/* Cinematic Thumbnail Preview Overlay */}
      <div className={`relative w-full ${isFullscreen ? 'h-full min-h-screen' : 'aspect-video'}`}>
        {/* Brightness Overlay */}
        {!isIframe && brightness < 1 && (
          <div
            className="absolute inset-0 bg-black pointer-events-none z-20"
            style={{ opacity: 1 - brightness }}
          />
        )}

        {/* Gesture HUD Indicator */}
        <AnimatePresence>
          {gestureHud.visible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
            >
              <div className="bg-black/85 border border-white/10 rounded-2xl px-6 py-4 flex flex-col items-center gap-3 backdrop-blur-md shadow-2xl min-w-[140px]">
                {gestureHud.type === "seek" && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Gauge className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-white text-xs font-black tracking-widest uppercase">Seek</span>
                    <span className="text-white font-mono text-sm font-black">{gestureHud.value}</span>
                  </div>
                )}
                {gestureHud.type === "brightness" && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                      <span className="text-yellow-400 font-bold text-lg">☀</span>
                    </div>
                    <span className="text-white text-xs font-black tracking-widest uppercase">Brightness</span>
                    <span className="text-white font-mono text-sm font-black">{gestureHud.value}</span>
                    {gestureHud.percentage !== undefined && (
                      <div className="w-20 h-1 bg-white/20 rounded-full overflow-hidden mt-1">
                        <div className="bg-yellow-400 h-full" style={{ width: `${gestureHud.percentage}%` }} />
                      </div>
                    )}
                  </div>
                )}
                {gestureHud.type === "volume" && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      {isMuted ? <VolumeX className="w-6 h-6 text-primary" /> : <Volume2 className="w-6 h-6 text-primary" />}
                    </div>
                    <span className="text-white text-xs font-black tracking-widest uppercase">Volume</span>
                    <span className="text-white font-mono text-sm font-black">{gestureHud.value}</span>
                    {gestureHud.percentage !== undefined && (
                      <div className="w-20 h-1 bg-white/20 rounded-full overflow-hidden mt-1">
                        <div className="bg-primary h-full" style={{ width: `${gestureHud.percentage}%` }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(isExtracting || isBuffering) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#080808]/80 backdrop-blur-xs z-20 pointer-events-none">
            <div className="relative w-16 h-16 pointer-events-auto">
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
                className="w-16 h-16 md:w-16 md:h-16 bg-primary/90 group-hover/preview:bg-primary group-hover/preview:scale-105 rounded-full flex items-center justify-center text-white shadow-[0_0_40px_rgba(155,12,12,0.5)] backdrop-blur-sm transition-all pointer-events-none border-2 border-[#4A2125]"
              >
                <Play className="w-8 h-8 md:w-8 md:h-8 fill-current" />
              </motion.button>
            </div>
          </div>
        )}

        {/* Center Play Button Overlay for Paused State */}
        {!isPlaying && hasInteracted && !isIframe && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/40 transition-colors pointer-events-none"
          >
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={togglePlay}
              className="w-12 h-12 md:w-12 md:h-12 bg-primary/90 hover:bg-primary rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(155,12,12,0.4)] backdrop-blur-sm transition-all pointer-events-auto cursor-pointer border-2 border-[#4A2125]"
            >
              <Play className="w-5 h-5 md:w-5 md:h-5 fill-current" />
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
                lastTimeRef.current = time;
                updateBuffered();
                if (!isPlaying) drawGlowFrame();
              }}
              onProgress={() => {
                updateBuffered();
              }}
              onLoadedMetadata={() => {
                setDuration(videoRef.current?.duration || 0);
                updateBuffered();
                if (videoRef.current) {
                  videoRef.current.playbackRate = playbackSpeed;
                  videoRef.current.currentTime = lastTimeRef.current;
                  if (wasPlayingRef.current) {
                    videoRef.current.play().then(() => {
                      setIsPlaying(true);
                    }).catch(() => { });
                  }
                }
                setTimeout(drawGlowFrame, 300);
              }}
              onClick={handleVideoClick}
              onPlay={() => {
                setIsPlaying(true);
                if ('mediaSession' in navigator) {
                  navigator.mediaSession.playbackState = 'playing';
                }
              }}
              onPause={() => {
                setIsPlaying(false);
                if ('mediaSession' in navigator) {
                  navigator.mediaSession.playbackState = 'paused';
                }
              }}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onSeeking={() => setIsBuffering(true)}
              onSeeked={() => {
                setIsBuffering(false);
                drawGlowFrame();
              }}
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

        {/* Double Tap Skip Animations */}
        <AnimatePresence>
          {showSkipOverlay.visible && showSkipOverlay.direction === "backward" && (
            <>
              {/* Left Ripple Backdrop */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 0.15 }}
                exit={{ scaleX: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-white/30 to-transparent origin-left rounded-r-[100px] pointer-events-none z-30"
              />
              {/* Left Spinning Indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: "-50%", x: "-50%" }}
                animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
                exit={{ opacity: 0, scale: 0.5, y: "-50%", x: "-50%" }}
                className="absolute left-1/4 top-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none"
              >
                <motion.div 
                  initial={{ rotate: 0 }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="w-20 h-20 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-[0_0_35px_rgba(155,12,12,0.35)]"
                >
                  <RotateCcw className="w-9 h-9 text-white" />
                </motion.div>
                <span className="text-white text-xs font-black uppercase tracking-widest bg-black/80 px-4 py-1.5 rounded-full backdrop-blur-sm shadow-md border border-white/5">
                  -{showSkipOverlay.count} seconds
                </span>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSkipOverlay.visible && showSkipOverlay.direction === "forward" && (
            <>
              {/* Right Ripple Backdrop */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 0.15 }}
                exit={{ scaleX: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-white/30 to-transparent origin-right rounded-l-[100px] pointer-events-none z-30"
              />
              {/* Right Spinning Indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: "-50%", x: "50%" }}
                animate={{ opacity: 1, scale: 1, y: "-50%", x: "50%" }}
                exit={{ opacity: 0, scale: 0.5, y: "-50%", x: "50%" }}
                className="absolute right-1/4 top-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none"
              >
                <motion.div 
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="w-20 h-20 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-[0_0_35px_rgba(155,12,12,0.35)]"
                >
                  <RotateCw className="w-9 h-9 text-white" />
                </motion.div>
                <span className="text-white text-xs font-black uppercase tracking-widest bg-black/80 px-4 py-1.5 rounded-full backdrop-blur-sm shadow-md border border-white/5">
                  +{showSkipOverlay.count} seconds
                </span>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(showControls || isBuffering || isExtracting) && hasInteracted && !isIframe && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/90 via-transparent to-black/60 p-4 md:p-6 pointer-events-none z-40"
            >
              <div className="flex justify-between items-start">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    router.back();
                  }} 
                  className="md:hidden p-2 rounded-full bg-black/60 border border-white/10 text-white/80 hover:text-white hover:bg-black/80 transition-all cursor-pointer pointer-events-auto"
                  title="Go Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-4 pointer-events-auto mt-auto">
                <div className="flex items-center gap-4">
                  <span className="text-white/80 text-xs font-mono">{formatTime(progress)}</span>
                  <div className="flex-1 relative flex items-center h-6" onMouseMove={handleProgressBarMouseMove} onMouseLeave={handleProgressBarMouseLeave}>
                    {hoverTime !== null && duration > 0 && (
                      <div
                        className="absolute bottom-6 bg-zinc-950/95 border border-white/10 rounded-lg overflow-hidden shadow-2xl z-50 pointer-events-none -translate-x-1/2 flex flex-col items-center p-1 w-32 backdrop-blur-xs"
                        style={{ left: `${hoverPosition}%` }}
                      >
                        <div className="w-full aspect-video bg-black rounded-md overflow-hidden relative">
                          <video
                            ref={setPreviewVideoElement}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        </div>
                        <span className="text-[10px] font-mono text-white/95 mt-1 font-semibold">
                          {formatTime(hoverTime)}
                        </span>
                      </div>
                    )}
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={progress}
                      onChange={(e) => {
                        const newTime = Number(e.target.value);
                        setProgress(newTime);
                        if (videoRef.current) videoRef.current.currentTime = newTime;
                      }}
                      onMouseDown={() => setIsScrubbing(true)}
                      onTouchStart={() => setIsScrubbing(true)}
                      onMouseUp={() => {
                        setIsScrubbing(false);
                        scheduleControlsHide();
                      }}
                      onTouchEnd={() => {
                        setIsScrubbing(false);
                        scheduleControlsHide();
                      }}
                      className="w-full h-1 appearance-none rounded-full cursor-pointer accent-primary hover:h-1.5 transition-all focus:outline-none [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:opacity-0 hover:[&::-webkit-slider-thumb]:opacity-100 [&::-moz-range-thumb]:opacity-0 hover:[&::-moz-range-thumb]:opacity-100 [&::-webkit-slider-thumb]:transition-opacity [&::-moz-range-thumb]:transition-opacity"
                      style={{
                        background: `linear-gradient(to right, rgb(155, 12, 12) 0%, rgb(155, 12, 12) ${(duration ? (progress / duration) * 100 : 0)}%, rgba(156, 163, 175, 0.4) ${(duration ? (progress / duration) * 100 : 0)}%, rgba(156, 163, 175, 0.4) ${(duration ? (Math.max(progress, buffered) / duration) * 100 : 0)}%, rgba(255, 255, 255, 0.15) ${(duration ? (Math.max(progress, buffered) / duration) * 100 : 0)}%, rgba(255, 255, 255, 0.15) 100%)`
                      }}
                    />
                  </div>
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
                        <Subtitles className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    )}

                    {/* Audio Group Switcher (Mic button) */}
                    {hasBothAudioGroups && (
                      <div className="relative">
                        <button
                          onClick={() => { setShowAudioMenu(!showAudioMenu); setShowQualityMenu(false); setShowSpeedMenu(false); }}
                          className={`transition-all flex items-center gap-1 ${activeAudioGroup === 'dub' ? 'text-primary' : 'text-white hover:text-accent'}`}
                          title="Switch Audio"
                        >
                          <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                          <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded uppercase hidden sm:inline">
                            {activeAudioGroup === 'dub' ? 'Dub' : 'Sub'}
                          </span>
                        </button>

                        <AnimatePresence>
                          {showAudioMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute bottom-10 right-0 bg-[#0c0c0c]/95 border border-white/10 rounded-xl p-2 w-36 flex flex-col gap-1 shadow-2xl backdrop-blur-md z-50 pointer-events-auto"
                            >
                              <button
                                onClick={() => switchAudioGroup('other')}
                                className={`text-left text-xs px-3 py-2 rounded-lg font-medium transition-all ${activeAudioGroup === 'other'
                                    ? 'bg-primary text-white'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                  }`}
                              >
                                Japanese (Sub)
                              </button>
                              <button
                                onClick={() => switchAudioGroup('dub')}
                                className={`text-left text-xs px-3 py-2 rounded-lg font-medium transition-all ${activeAudioGroup === 'dub'
                                    ? 'bg-primary text-white'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                  }`}
                              >
                                English (Dub)
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Playback Speed settings */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowSpeedMenu(!showSpeedMenu);
                          setShowQualityMenu(false);
                          setShowAudioMenu(false);
                        }}
                        className="text-white hover:text-accent transition-all flex items-center gap-1"
                        title="Playback Speed"
                      >
                        <Gauge className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded uppercase">
                          {playbackSpeed === 1 ? "1x" : `${playbackSpeed}x`}
                        </span>
                      </button>

                      <AnimatePresence>
                        {showSpeedMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-10 right-0 bg-[#0c0c0c]/95 border border-white/10 rounded-xl p-2 w-24 flex flex-col gap-1 shadow-2xl backdrop-blur-md z-50 pointer-events-auto"
                          >
                            {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                              <button
                                key={speed}
                                onClick={() => {
                                  if (videoRef.current) {
                                    videoRef.current.playbackRate = speed;
                                  }
                                  setPlaybackSpeed(speed);
                                  setShowSpeedMenu(false);
                                }}
                                className={`text-left text-xs px-3 py-2 rounded-lg font-medium transition-all ${
                                  playbackSpeed === speed
                                    ? "bg-primary text-white"
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                {speed === 1 ? "Normal" : `${speed}x`}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {levels.length > 1 && (
                      <div className="relative">
                        <button
                          onClick={() => { setShowQualityMenu(!showQualityMenu); setShowAudioMenu(false); setShowSpeedMenu(false); }}
                          className="text-white hover:text-accent transition-all flex items-center gap-1"
                          title="Quality Settings"
                        >
                          <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
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
                                  className={`text-left text-xs px-3 py-2 rounded-lg font-medium transition-all ${currentLevel === level.id
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

                    {/* Cinema Glow Toggle */}
                    {!isIframe && (
                      <button
                        onClick={toggleCinemaGlow}
                        className={`transition-all active:scale-95 cursor-pointer ${
                          isCinemaGlow ? "text-primary" : "text-white/60 hover:text-white"
                        }`}
                        title="Cinema Glow (Ambient Backlight)"
                      >
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    )}

                    {/* Theater Mode Toggle */}
                    {onTheaterToggle && (
                      <button
                        onClick={onTheaterToggle}
                        className={`transition-all hidden md:inline-flex active:scale-95 cursor-pointer ${
                          isTheaterMode ? "text-primary" : "text-white/60 hover:text-white"
                        }`}
                        title="Theater Mode"
                      >
                        <Monitor className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    )}

                    <button onClick={toggleFullscreen} className="text-white hover:text-accent transition-all">
                      <Maximize className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </div>
  );
}
