"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAnimeTitle, getMangaFormat, slugify } from "@/lib/anime-utils";

interface MangaTrendingSidebarProps {
  initialData: any[];
}

export function MangaTrendingSidebar({ initialData }: MangaTrendingSidebarProps) {
  const [trendingManga] = useState<any[]>(initialData);

  return (
    <section className="sticky top-8 mb-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl md:text-2xl font-black tracking-tighter text-white relative inline-block uppercase italic">
          Reader&apos;s Top
          <div className="absolute -bottom-2 left-0 w-8 h-1 bg-primary rounded-full" />
        </h2>
      </div>
      
      <div className="flex flex-col bg-[#120c24]/50 rounded-[2rem] border border-border shadow-2xl overflow-hidden backdrop-blur-sm">
        {trendingManga.length > 0 ? trendingManga.slice(0, 10).map((manga: any, idx: number) => {
          const title = getAnimeTitle(manga.title);
          const slug = manga.slug || slugify(title);
          return (
            <Link href={`/manga/${manga.id}/${slug}`} key={`manga-side-${manga.id}`} className={`flex gap-4 items-center group hover:bg-white/5 p-4 transition-colors ${idx !== 0 ? 'border-t border-white/5' : ''}`}>
              <div className={`w-8 text-center text-xl font-black ${idx < 3 ? 'text-primary' : 'text-white/20 group-hover:text-white/60'} transition-colors italic`}>
                {(idx + 1).toString().padStart(2, '0')}
              </div>
              <div className="w-[50px] h-[75px] rounded-lg overflow-hidden relative shadow-lg shrink-0">
                <Image unoptimized fill sizes="50px" src={manga.image || ""} alt={title} className="object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="flex flex-col flex-1 min-w-0 pr-2">
                <h4 className="text-xs font-bold text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-1">{title}</h4>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] text-white/40 font-black bg-white/5 py-0.5 px-1.5 rounded uppercase tracking-wider">{getMangaFormat(manga.countryOfOrigin, manga.type)}</span>
                  {manga.chapters && (
                    <span className="flex items-center text-[8px] text-primary font-black py-0.5 px-1.5 rounded uppercase tracking-wider bg-primary/10 border border-primary/20">
                      CH {manga.chapters}
                    </span>
                  )}
                  {manga.rating && (
                    <span className="flex items-center text-[8px] text-white/60 font-black py-0.5 px-1.5 rounded uppercase tracking-wider bg-white/5">
                      {Number(manga.rating / 10).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        }) : (
          <p className="py-20 text-center text-white/20 font-medium italic">
            Manga ranking not available.
          </p>
        )}
      </div>
      
      <Link href="/manga" className="mt-4 w-full block text-center text-[10px] font-black text-white/20 hover:text-white transition-all uppercase tracking-[0.2em] bg-white/5 hover:bg-white/10 py-4 rounded-2xl border border-white/5">
        Browse Library
      </Link>
    </section>
  );
}
