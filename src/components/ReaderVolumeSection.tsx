"use client";

import { useEffect, useState, useRef } from "react";
import { BookOpen, Upload, Search, Trash2, ArrowUpRight, Check, FileText } from "lucide-react";
import { getUploadedVolumesForNovel, saveVolume, deleteVolume } from "@/lib/indexedDb";
import Link from "next/link";

interface ReaderVolumeSectionProps {
  mangaId: string;
  slug: string;
  title: string;
  volumesCount?: number;
}

export function ReaderVolumeSection({ mangaId, slug, title, volumesCount = 20 }: ReaderVolumeSectionProps) {
  const [uploadedMap, setUploadedMap] = useState<Record<number, { fileName: string; uploadedAt: string }>>({});
  const [uploadingVol, setUploadingVol] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeVolUploadRef = useRef<number | null>(null);

  const count = volumesCount && volumesCount > 0 ? volumesCount : 20;

  useEffect(() => {
    async function loadUploads() {
      const uploads = await getUploadedVolumesForNovel(mangaId);
      setUploadedMap(uploads);
    }
    loadUploads();
  }, [mangaId]);

  const handleUploadClick = (vol: number) => {
    activeVolUploadRef.current = vol;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const vol = activeVolUploadRef.current;
    if (!file || vol === null) return;

    setUploadingVol(vol);
    try {
      await saveVolume(mangaId, vol, file);
      const uploads = await getUploadedVolumesForNovel(mangaId);
      setUploadedMap(uploads);
    } catch (err) {
      console.error("Failed to upload volume:", err);
      alert("Failed to save file locally. Storage might be restricted.");
    } finally {
      setUploadingVol(null);
      activeVolUploadRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteClick = async (vol: number) => {
    if (!confirm(`Are you sure you want to delete the local file for Volume ${vol}?`)) return;
    try {
      await deleteVolume(mangaId, vol);
      const uploads = await getUploadedVolumesForNovel(mangaId);
      setUploadedMap(uploads);
    } catch (err) {
      console.error("Failed to delete volume:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pb-4 border-b border-white/5">
        <BookOpen className="w-6 h-6 text-primary shrink-0" />
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Light Novel Volumes</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mt-1">
            {count} Official Volumes · Import EPUB/PDF to read
          </p>
        </div>
      </div>

      {/* Hidden input for upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".epub,.pdf"
        className="hidden"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: count }, (_, i) => {
          const vol = i + 1;
          const uploaded = uploadedMap[vol];
          const isUploading = uploadingVol === vol;
          const isPdf = uploaded?.fileName.toLowerCase().endsWith(".pdf");

          const searchTitleClean = title.replace(/\(Light Novel\)/gi, "").trim();
          const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${searchTitleClean} Volume ${vol} epub download`)}`;

          return (
            <div
              key={vol}
              className={`p-5 border rounded-[2rem] transition-all flex flex-col justify-between gap-4 ${uploaded
                ? "bg-primary/5 border-primary/20 shadow-lg shadow-primary/5"
                : "bg-white/5 hover:bg-white/[0.07] border-white/5"
                }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                    Volume {vol}
                    {uploaded && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shrink-0">
                        <Check className="w-3 h-3" />
                        Uploaded
                      </span>
                    )}
                  </h4>
                  {uploaded ? (
                    <p className="text-xs text-white/50 mt-1 flex items-center gap-1.5 break-all line-clamp-2">
                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      {uploaded.fileName}
                    </p>
                  ) : (
                    <p className="text-xs text-white/30 mt-1 font-medium">
                      No local file uploaded yet. Search or import your copy.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {uploaded ? (
                  <>
                    <Link
                      href={`/reader/read-local?id=${mangaId}&slug=${slug}&vol=${vol}`}
                      className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Read Now
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(vol)}
                      title="Delete uploaded file"
                      className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleUploadClick(vol)}
                      disabled={isUploading}
                      className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      {isUploading ? "Uploading..." : "Import File"}
                    </button>
                    <a
                      href={googleSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Search
                      <ArrowUpRight className="w-3 h-3 opacity-50" />
                    </a>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
