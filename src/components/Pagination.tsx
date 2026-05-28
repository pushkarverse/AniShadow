import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  hasNextPage: boolean;
  baseUrl: string;
  extraParams?: Record<string, string | number | undefined>;
}

export function Pagination({ currentPage, hasNextPage, baseUrl, extraParams }: PaginationProps) {
  const getPageUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (extraParams) {
      Object.entries(extraParams).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          params.set(key, val.toString());
        }
      });
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = hasNextPage && currentPage < 50 ? currentPage + 1 : null;

  if (!prevPage && !nextPage) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-16 group">
      {prevPage ? (
        <Link
          href={getPageUrl(prevPage)}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-accent/40 transition-all duration-300 shadow-lg shadow-black/20"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-widest">Prev</span>
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.02] border border-white/5 text-white/10 cursor-not-allowed">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-widest">Prev</span>
        </div>
      )}

      <div className="flex items-center justify-center p-[2px] rounded-full bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20">
        <div className="px-8 py-3 rounded-full bg-[#0a0a0a] border border-white/5 flex items-center justify-center min-w-[120px]">
          <span className="text-xs uppercase tracking-[0.3em] font-black text-white/40 mr-2">Page</span>
          <span className="text-xl font-black text-accent tracking-tighter">{currentPage}</span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/20 ml-2">/ 50</span>
        </div>
      </div>

      {nextPage ? (
        <Link
          href={getPageUrl(nextPage)}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-accent/40 transition-all duration-300 shadow-lg shadow-black/20"
        >
          <span className="text-sm font-bold uppercase tracking-widest">Next</span>
          <ChevronRight className="w-5 h-5" />
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.02] border border-white/5 text-white/10 cursor-not-allowed">
          <span className="text-sm font-bold uppercase tracking-widest">Next</span>
          <ChevronRight className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
