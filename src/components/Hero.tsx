"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { slugify } from "@/lib/anime-utils";

export interface HeroItem {
  id: string;
  title: string;
  slug?: string;
  description: string;
  image: string;
  genres: string[];
  rating?: string | number;
  releaseDate?: string | number;
  quality?: string;
  type?: string;
  subEpisodes?: number;
  dubEpisodes?: number;
}

interface HeroProps {
  items: HeroItem[];
}

export function Hero({ items = [] }: HeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [nextSlide, items.length]);

  if (items.length === 0) return null;

  const currentItem = items[currentIndex];
  const fallbackBanner = "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?q=80&w=2000&auto=format&fit=crop";
  const finalImage = (!currentItem.image || currentItem.image === "" || currentItem.image === "undefined" || currentItem.image.includes('undefined')) ? fallbackBanner : currentItem.image;

  const variants = {
    enter: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 100 : -100,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      opacity: 0,
      x: direction < 0 ? 100 : -100,
    }),
  };

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[2/1] xl:aspect-[21/9] min-h-[320px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] overflow-hidden rounded-none group bg-[#080808]">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.5 },
          }}
          className="absolute inset-0"
        >
          {/* Background Image Container */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <Image
              src={finalImage}
              alt={currentItem.title}
              fill
              priority
              loading="eager"
              sizes="(max-width: 1280px) 100vw, 75vw"
              className="object-cover object-center scale-105 transition-transform duration-[20s] ease-out"
            />
            {/* Darker Gradient for content readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/90 via-[#080808]/40 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 px-4 md:px-12 lg:px-20 h-full flex flex-col justify-center">
            <div className="max-w-4xl pt-8">
              <motion.h1 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter mb-4 max-w-[90%] drop-shadow-2xl"
              >
                {currentItem.title}
              </motion.h1>

              {/* Status Badges & Info */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center gap-3 mb-6"
              >
                <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/20 text-primary rounded border border-primary/30 text-[10px] font-black uppercase tracking-tighter">
                  CC <span className="text-white/60">{currentItem.subEpisodes || 0}</span>
                </div>
                {currentItem.dubEpisodes !== undefined && currentItem.dubEpisodes > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 text-amber-500 rounded border border-amber-500/30 text-[10px] font-black uppercase tracking-tighter">
                    Mic <span className="text-white/60">{currentItem.dubEpisodes}</span>
                  </div>
                )}
                <span className="text-xs font-black text-white/40 uppercase tracking-widest ml-1">{currentItem.type}</span>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-xs font-bold text-white/60 line-clamp-1">{currentItem.genres.join(", ")}</span>
              </motion.div>
              
              <motion.div
                key={`desc-${currentItem.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/60 text-sm md:text-base mb-4 md:mb-8 max-w-2xl leading-relaxed drop-shadow-md line-clamp-3 [&>i]:font-serif [&>i]:text-white/90 [&>br]:hidden"
              >
                <div 
                  dangerouslySetInnerHTML={{ __html: currentItem.description || '' }}
                />
              </motion.div>

              {/* Metadata Box */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="inline-flex flex-wrap items-center gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 mb-6 md:mb-10 shadow-2xl"
              >
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5 font-black">Rating</span>
                  <span className="text-sm font-black text-white">{currentItem.rating || "8.5"}</span>
                </div>
                <div className="w-[1px] h-8 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5 font-black">Release</span>
                  <span className="text-sm font-black text-white">{currentItem.releaseDate || "2024"}</span>
                </div>
                <div className="w-[1px] h-8 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1.5 font-black">Quality</span>
                  <span className="text-sm font-black text-white">{currentItem.quality || "HD"}</span>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-4"
              >
                <Link 
                  href={`/watch/${currentItem.id}/${currentItem.slug || slugify(currentItem.title)}?ep=1`} 
                  className="flex items-center justify-center h-12 md:h-14 px-8 md:px-12 bg-primary hover:bg-accent text-white font-black rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 text-xs md:text-sm uppercase tracking-widest"
                >
                  Watch Now
                </Link>
                <button 
                  type="button" 
                  suppressHydrationWarning
                  className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all active:scale-90"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation and Counter (Bottom Right) */}
      {items.length > 1 && (
        <div className="absolute right-8 md:right-12 bottom-12 z-20 flex items-center gap-6 select-none bg-black/20 backdrop-blur-sm px-6 py-3 rounded-full border border-white/5">
          <button 
            onClick={prevSlide}
            suppressHydrationWarning
            className="text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-baseline gap-1 text-white font-black tracking-tighter">
            <span className="text-xl">{currentIndex + 1}</span>
            <span className="text-xs text-white/20">/</span>
            <span className="text-xs text-white/40">{items.length}</span>
          </div>

          <button 
            onClick={nextSlide}
            suppressHydrationWarning
            className="text-white/40 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Subtle Bottom Indicators */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-20 flex gap-2">
        {items.map((_, idx) => (
          <button
            key={idx}
            suppressHydrationWarning
            onClick={() => {
              setDirection(idx > currentIndex ? 1 : -1);
              setCurrentIndex(idx);
            }}
            className={`h-1 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-6 bg-[#eb663e]' : 'w-2 bg-white/20 hover:bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  );
}
