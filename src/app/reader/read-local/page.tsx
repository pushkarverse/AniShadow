import { LocalReaderClient } from "./LocalReaderClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ id?: string; slug?: string; vol?: string }>;
}

export default async function ReadLocalPage({ searchParams }: PageProps) {
  const { id, slug, vol } = await searchParams;

  if (!id || !slug || !vol) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-3xl font-black text-primary uppercase italic mb-4 tracking-tighter">Invalid Request</h1>
        <p className="text-white/40 text-sm max-w-sm mb-8">Missing required parameters to read the local volume.</p>
        <Link
          href="/reader"
          className="px-8 py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
        >
          Go to Library
        </Link>
      </div>
    );
  }

  const volNum = parseInt(vol, 10);

  return (
    <LocalReaderClient
      id={id}
      slug={slug}
      vol={volNum}
    />
  );
}
