import { getMangaChapterPages, getMangaDetails } from "@/lib/consumet";
import { MangaReaderClient } from "./MangaReaderClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; slug: string; chapterId: string[] }>;
}

export default async function MangaReaderPage({ params }: PageProps) {
  const { id, slug, chapterId: chapterIdArray } = await params;
  const chapterId = decodeURIComponent(chapterIdArray.join("/"));
  
  const pages = await getMangaChapterPages(chapterId);

  if (!pages || pages.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-2xl font-black text-primary uppercase mb-4 italic tracking-tighter">Content Unavailable</h1>
        <p className="text-white/40 max-w-sm mb-8">This chapter&apos;s images could not be loaded from our providers. The source might be down or encrypted.</p>
        <div className="flex gap-4">
             <Link href="/manga" className="px-8 py-3 bg-white/5 text-white rounded-xl font-bold uppercase tracking-widest text-xs border border-white/5">Library</Link>
             <Link href={`/manga/${id}/${slug}`} className="px-8 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20">Manga Info</Link>
        </div>
      </div>
    );
  }

  // Fetch manga details to get all chapters for next/prev navigation
  const manga = await getMangaDetails(id);
  const chapters = manga?.chapters || [];
  
  // Sort chapters ascending by chapter number so index math is correct
  const sortedChapters = [...chapters].sort((a: any, b: any) => {
    const numA = parseFloat(a.number || "0");
    const numB = parseFloat(b.number || "0");
    return numA - numB;
  });

  const currentIndex = sortedChapters.findIndex((c: any) => c.id === chapterId);
  const nextChapter = currentIndex !== -1 && currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;
  const prevChapter = currentIndex !== -1 && currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;

  const currentChapterInfo = sortedChapters.find((c: any) => c.id === chapterId);
  const chapterTitle = currentChapterInfo 
    ? (currentChapterInfo.title ? `Chapter ${currentChapterInfo.number}: ${currentChapterInfo.title}` : `Chapter ${currentChapterInfo.number}`)
    : `Chapter ${chapterId.split(":").pop()}`;

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
        mangaId={id}
        slug={slug}
        nextChapterId={nextChapter?.id || null}
        prevChapterId={prevChapter?.id || null}
        chapterTitle={chapterTitle}
        chapterNumber={currentChapterInfo?.number || currentChapterInfo?.chapterNumber || ""}
        chapters={sortedChapters}
      />
    </div>
  );
}
