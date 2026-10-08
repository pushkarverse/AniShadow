import { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Providers } from "@/components/Providers";
import { RouteProgress } from "@/components/RouteProgress";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import NotFoundPage from "@/pages/NotFoundPage";

const HomePage = lazy(() => import("@/pages/HomePage"));
const OfflinePage = lazy(() => import("@/pages/OfflinePage"));

const AnimeHomePage = lazy(() => import("@/pages/anime/AnimeHomePage"));
const TrendingPage = lazy(() => import("@/pages/anime/TrendingPage"));
const LatestPage = lazy(() => import("@/pages/anime/LatestPage"));
const PopularPage = lazy(() => import("@/pages/anime/PopularPage"));
const SearchPage = lazy(() => import("@/pages/anime/SearchPage"));
const WatchlistPage = lazy(() => import("@/pages/anime/WatchlistPage"));
const AnimeRedirectPage = lazy(() => import("@/pages/anime/AnimeRedirectPage"));
const AnimeDetailPage = lazy(() => import("@/pages/anime/AnimeDetailPage"));
const WatchPage = lazy(() => import("@/pages/anime/WatchPage"));

const CommunityPage = lazy(() => import("@/pages/community/CommunityPage"));
const CommunityWatchPage = lazy(
  () => import("@/pages/community/CommunityWatchPage")
);

const ReaderHomePage = lazy(() => import("@/pages/reader/ReaderHomePage"));
const ReaderSearchPage = lazy(() => import("@/pages/reader/ReaderSearchPage"));
const ReaderRedirectPage = lazy(
  () => import("@/pages/reader/ReaderRedirectPage")
);
const ReaderDetailPage = lazy(
  () => import("@/pages/reader/ReaderDetailPage")
);
const ReaderChapterPage = lazy(
  () => import("@/pages/reader/ReaderChapterPage")
);
const ReadLocalPage = lazy(() => import("@/pages/reader/ReadLocalPage"));

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}

function RouteFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm font-medium text-white/40">Loading…</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Providers>
      <RouteProgress />
      <ScrollToTop />
      <div className="relative flex min-h-screen flex-col">
        <main className="flex-1 pb-20 md:pb-0">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/offline" element={<OfflinePage />} />

              <Route path="/anime" element={<AnimeHomePage />} />
              <Route path="/anime/trending" element={<TrendingPage />} />
              <Route path="/anime/latest" element={<LatestPage />} />
              <Route path="/anime/popular" element={<PopularPage />} />
              <Route path="/anime/search" element={<SearchPage />} />
              <Route path="/anime/watchlist" element={<WatchlistPage />} />
              <Route path="/anime/watch/:id/:slug" element={<WatchPage />} />
              <Route path="/anime/:id" element={<AnimeRedirectPage />} />
              <Route path="/anime/:id/:slug" element={<AnimeDetailPage />} />

              <Route path="/community" element={<CommunityPage />} />
              <Route
                path="/community/watch/:id/:slug"
                element={<CommunityWatchPage />}
              />

              <Route path="/reader" element={<ReaderHomePage />} />
              <Route path="/reader/search" element={<ReaderSearchPage />} />
              <Route path="/reader/read-local" element={<ReadLocalPage />} />
              <Route
                path="/reader/read/:id/:slug/*"
                element={<ReaderChapterPage />}
              />
              <Route path="/reader/:id" element={<ReaderRedirectPage />} />
              <Route path="/reader/:id/:slug" element={<ReaderDetailPage />} />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <PWAInstallPrompt />
      </div>
    </Providers>
  );
}
