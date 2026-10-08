import { Link } from "@/compat/Link";
import { usePageMeta } from "@/lib/usePageMeta";

export default function NotFoundPage() {
  usePageMeta("Page Not Found | AniShadow");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="p-10 rounded-3xl bg-white/5 border border-white/5 shadow-2xl max-w-lg backdrop-blur-xl">
        <h1 className="text-6xl font-black text-primary uppercase tracking-tighter mb-4">
          404
        </h1>
        <p className="text-white/50 mb-8 leading-relaxed font-medium">
          This page doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/anime"
          className="inline-block px-10 py-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all uppercase tracking-widest text-sm"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
