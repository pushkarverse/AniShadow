import { getReaderChapterPages, getReaderDetails } from "@/lib/consumet";
import {
  decodeReaderChapterPathId,
  findReaderChapter,
  getChapterDisplayTitle,
  readerChapterIdsMatch
} from "@/lib/rezero";
import { MangaReaderClient } from "./MangaReaderClient";
import { NovelReaderClient } from "./NovelReaderClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; slug: string; chapterId: string[] }>;
}

export default async function MangaReaderPage({ params }: PageProps) {
  const { id, slug, chapterId: chapterIdArray } = await params;
  const chapterId = decodeReaderChapterPathId(chapterIdArray);
  
  const pages = await getReaderChapterPages(chapterId);

  if (!pages || pages.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-2xl font-black text-primary uppercase mb-4 italic tracking-tighter">Content Unavailable</h1>
        <p className="text-white/40 max-w-sm mb-8">This chapter&apos;s content could not be loaded from our providers. The source might be down or encrypted.</p>
        <div className="flex gap-4">
             <Link href="/reader" className="px-8 py-3 bg-white/5 text-white rounded-xl font-bold uppercase tracking-widest text-xs border border-white/5">Library</Link>
             <Link href={`/reader/${id}/${slug}`} className="px-8 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20">Info Page</Link>
        </div>
      </div>
    );
  }

  // Fetch manga details to get all chapters for next/prev navigation
  const manga = await getReaderDetails(id);
  const chapters = manga?.chapters || [];
  
  // Sort chapters ascending by chapter number so index math is correct
  const sortedChapters = [...chapters].sort((a: any, b: any) => {
    const numA = parseFloat(a.number || "0");
    const numB = parseFloat(b.number || "0");
    return numA - numB;
  });

  const currentIndex = sortedChapters.findIndex((c: any) => readerChapterIdsMatch(c.id, chapterId));
  const nextChapter = currentIndex !== -1 && currentIndex < sortedChapters.length - 1 ? sortedChapters[currentIndex + 1] : null;
  const prevChapter = currentIndex !== -1 && currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;

  const currentChapterInfo = findReaderChapter(sortedChapters, chapterId);
  const chapterTitle = getChapterDisplayTitle(
    chapterId,
    currentChapterInfo,
    currentChapterInfo?.number
  );

  const isNovel = chapterId.startsWith("novelfull:") || chapterId.startsWith("novelbin:") || chapterId.startsWith("witchcult:") || (pages[0] && "text" in pages[0]);
  const arcs = (manga as any)?.arcs || [];

  if (isNovel) {
    const contentHtml = (pages[0] as any).text || "";
    return (
      <NovelReaderClient
        contentHtml={contentHtml}
        chapterId={chapterId}
        mangaId={id}
        slug={slug}
        nextChapterId={nextChapter?.id || null}
        prevChapterId={prevChapter?.id || null}
        chapterTitle={chapterTitle}
        chapterNumber={currentChapterInfo?.number || currentChapterInfo?.chapterNumber || ""}
        chapters={sortedChapters}
        arcs={arcs}
      />
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
