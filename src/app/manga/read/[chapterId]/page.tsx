import { getMangaChapterPages } from "@/lib/consumet";
import { MangaReaderClient } from "./MangaReaderClient";

interface PageProps {
  params: Promise<{ chapterId: string }>;
  searchParams: Promise<{ mangaId?: string }>;
}

export default async function MangaReaderPage({ params, searchParams }: PageProps) {
  const { chapterId } = await params;
  const { mangaId } = await searchParams;
  
  const pages = await getMangaChapterPages(chapterId);

  if (!pages || pages.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-2xl font-black text-primary uppercase mb-4 italic tracking-tighter">Content Unavailable</h1>
        <p className="text-white/40 max-w-sm mb-8">This chapter's images could not be loaded from our providers. The source might be down or encrypted.</p>
        <div className="flex gap-4">
             <a href="/manga" className="px-8 py-3 bg-white/5 text-white rounded-xl font-bold uppercase tracking-widest text-xs border border-white/5">Library</a>
             {mangaId && <a href={`/manga/${mangaId}`} className="px-8 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20">Manga Info</a>}
        </div>
      </div>
    );
  }

  // Map the simple image URLs to the object format expected by the client
  const formattedPages = pages.map((p: any, idx: number) => ({
    page: idx + 1,
    img: typeof p === 'string' ? p : p.img || p.url || ""
  }));

  return (
    <div className="bg-black">
      <MangaReaderClient 
        pages={formattedPages} 
        chapterId={chapterId} 
        mangaId={mangaId}
      />
    </div>
  );
}
