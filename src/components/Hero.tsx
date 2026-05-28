"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Play, Info } from "lucide-react";
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
  poster?: string;
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
    <div className="relative w-full aspect-[4/3] md:aspect-[2/1] xl:aspect-[21/9] min-h-[520px] sm:min-h-[500px] md:min-h-[500px] lg:min-h-[600px] overflow-hidden rounded-none group bg-[#080808]">
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
          {/* Desktop Background (Landscape) */}
          <div className="absolute inset-0 z-0 hidden md:block overflow-hidden">
            <Image
              src={finalImage}
              alt={currentItem.title}
              fill
              priority
              loading="eager"
              sizes="100vw"
              className="object-cover object-center scale-105 transition-transform duration-[20s] ease-out"
              unoptimized
            />
            {/* Desktop Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/90 via-[#080808]/40 to-transparent" />
          </div>

          {/* Mobile Background (Portrait/Poster - Matching Image 2) */}
          <div className="absolute inset-0 z-0 block md:hidden overflow-hidden">
            <Image
              src={currentItem.poster || finalImage}
              alt={currentItem.title}
              fill
              priority
              loading="eager"
              sizes="100vw"
              className="object-cover object-center scale-100 transition-transform duration-[20s] ease-out"
              unoptimized
            />
            {/* Mobile Dark Gradient Overlay to maximize readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/75 to-[#080808]/40" />
            <div className="absolute inset-0 bg-black/35" />
          </div>

          {/* Content Container */}
          <div className="relative z-10 px-6 md:px-12 lg:px-20 h-full flex flex-col justify-end pb-12 md:justify-center md:pb-0">
            <div className="w-full max-w-4xl pt-8 flex flex-col items-center text-center md:items-start md:text-left">
              
              {/* Metadata Badges */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-2.5 mb-3 md:justify-start"
              >
                <div className="flex items-center gap-1 px-2.5 py-1 bg-green-500/20 text-green-400 rounded border border-green-500/30 text-[10px] font-black uppercase tracking-widest shadow-md">
                  ★ {currentItem.rating || "8.5"}
                </div>
                <div className="px-2.5 py-1 bg-white/10 text-white rounded border border-white/15 text-[10px] font-black uppercase tracking-widest">
                  {currentItem.type || "TV"}
                </div>
                <div className="px-2.5 py-1 bg-white/10 text-white rounded border border-white/15 text-[10px] font-black uppercase tracking-widest">
                  {currentItem.releaseDate || "2024"}
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tighter mb-4 text-center md:text-left drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
              >
                {currentItem.title}
              </motion.h1>
              
              {/* Description */}
              <motion.div
                key={`desc-${currentItem.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/70 text-xs md:text-base text-center md:text-left mb-6 md:mb-8 max-w-sm md:max-w-2xl leading-relaxed drop-shadow-md line-clamp-2 md:line-clamp-3"
              >
                <div 
                  dangerouslySetInnerHTML={{ __html: currentItem.description || '' }}
                />
              </motion.div>

              {/* Buttons (Responsive Centered Row - Matching Image 2) */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-3 w-full justify-center md:justify-start"
              >
                <Link 
                  href={`/watch/${currentItem.id}/${currentItem.slug || slugify(currentItem.title)}?ep=1`} 
                  className="flex items-center justify-center h-11 md:h-14 px-6 md:px-12 bg-primary hover:bg-accent text-white font-black rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 text-xs md:text-sm uppercase tracking-widest gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  Watch Now
                </Link>
                
                <Link 
                  href={`/anime/${currentItem.id}/${currentItem.slug || slugify(currentItem.title)}`} 
                  className="flex items-center justify-center h-11 md:h-14 px-6 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl border border-white/10 transition-all active:scale-95 text-xs md:text-sm uppercase tracking-widest gap-2 cursor-pointer"
                >
                  <Info className="w-4 h-4 shrink-0" />
                  Details
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Mid-Right Page Controls (Reanime style) */}
      {items.length > 1 && (
        <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 select-none">
          <button 
            onClick={prevSlide}
            suppressHydrationWarning
            className="w-9 h-9 flex items-center justify-center bg-black/65 backdrop-blur-md text-white hover:text-white rounded-md border border-white/10 transition-all cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={nextSlide}
            suppressHydrationWarning
            className="w-9 h-9 flex items-center justify-center bg-black/65 backdrop-blur-md text-white hover:text-white rounded-md border border-white/10 transition-all cursor-pointer active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom-Right Indicators */}
      {items.length > 1 && (
        <div className="absolute right-8 md:right-12 bottom-8 z-20 flex gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              suppressHydrationWarning
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-primary' : 'w-3 bg-white/30 hover:bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
