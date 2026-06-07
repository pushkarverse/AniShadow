"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Search, Menu, SlidersHorizontal, Shuffle, Users, Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SearchFilters } from "./SearchFilters";
import { BottomTabBar } from "./BottomTabBar";
import { SearchModal } from "./SearchModal";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isShuffling, setIsShuffling] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Shortcut CTRL + S / CMD + S to open search modal
  useEffect(() => {
    function handleGlobalShortcut(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  const [isMangaRoute, setIsMangaRoute] = useState(pathname?.startsWith('/reader') || false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMangaPath = window.location.pathname.startsWith('/reader');
    const params = new URLSearchParams(window.location.search);
    const isMangaSearch = window.location.pathname.startsWith('/search') && params.get('type') === 'MANGA';
    setIsMangaRoute(isMangaPath || isMangaSearch);
  });

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      const typeParam = isMangaRoute ? "&type=MANGA" : "";
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}${typeParam}`);
      setIsFilterOpen(false);
      setIsMobileSearchOpen(false);
    }
  };

  const handleRandom = async () => {
    setIsShuffling(true);
    try {
      const res = await fetch("/api/random");
        if (res.ok) {
          const data = await res.json();
          router.push(`/watch/${data.id}/${data.slug || 'anime'}`);
        }
    } catch (error) {
      console.error("Failed to fetch random anime:", error);
    } finally {
      setIsShuffling(false);
    }
  };

  const notifications = [
    { id: 1, title: "New Episode", message: "Solo Leveling Episode 12 is now available!", time: "2h ago", unread: true },
    { id: 2, title: "Trending", message: "Kaiju No. 8 is climbing the charts this week.", time: "5h ago", unread: true },
    { id: 3, title: "Welcome", message: "Thanks for joining AniShadow! Enjoy your stay.", time: "1d ago", unread: false },
  ];

  return (
    <header className="relative w-full z-50 py-4 bg-card border-b border-border shadow-2xl">
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Left: Logo & Menu Toggle */}
        <div className="flex items-center gap-4">
          <button 
            className="p-2 hover:bg-white/5 rounded-full transition-colors hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link href="/" className="flex items-center group">
            <div className="relative w-36 h-8 md:w-44 md:h-10 shrink-0 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="AniShadow Logo"
                fill
                priority
                sizes="(max-width: 768px) 144px, 176px"
                className="object-contain object-left"
              />
            </div>
          </Link>

          {/* Brand Switcher */}
          <div className="hidden sm:flex items-center bg-white/5 p-0.5 rounded-full border border-white/5 ml-2">
            <Link 
              href="/" 
              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all ${!isMangaRoute ? 'bg-[#5c0606] text-white shadow-lg shadow-[#5c0606]/20' : 'text-white/40 hover:text-white'}`}
            >
              Anime
            </Link>
            <Link 
              href="/reader" 
              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all ${isMangaRoute ? 'bg-[#5b128c] text-white shadow-lg shadow-[#5b128c]/20' : 'text-white/40 hover:text-white'}`}
            >
              Reader
            </Link>
          </div>
        </div>

        {/* Center: Search Bar (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-2xl px-4 relative">
          <div 
            onClick={() => setIsSearchModalOpen(true)}
            className="relative w-full group cursor-pointer"
          >
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40 group-hover:text-primary transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              readOnly
              placeholder={isMangaRoute ? "Search reader..." : "Search anime..."}
              suppressHydrationWarning
              className="w-full h-11 bg-white/5 border border-white/10 rounded-full pl-11 pr-20 text-sm cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all outline-none select-none"
            />
            <div className="absolute inset-y-0 right-4 flex items-center gap-1 pointer-events-none select-none">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/30 border border-white/10 text-[9px] font-sans font-bold shadow-inner">⌘</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/30 border border-white/10 text-[9px] font-sans font-bold shadow-inner">S</kbd>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 md:gap-3">
          <div className="hidden lg:flex items-center gap-1 mr-4">
            <Link 
              href="/community" 
              title="Community" 
              className="p-2.5 text-white/60 hover:text-white hover:bg-white/5 rounded-full transition-all"
            >
              <Users className="w-5 h-5" />
            </Link>
            {!isMangaRoute && (
              <button 
                onClick={handleRandom}
                disabled={isShuffling}
                suppressHydrationWarning
                title="Random Anime" 
                className={`p-2.5 text-white/60 hover:text-white hover:bg-white/5 rounded-full transition-all ${isShuffling ? "animate-spin opacity-50" : ""}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Mobile Search Toggle - Hidden on mobile in favor of bottom tab bar search option */}
          <button
            onClick={() => {
              setIsMobileSearchOpen(!isMobileSearchOpen);
              setIsMobileMenuOpen(false);
            }}
            className={`p-2.5 rounded-full transition-all hidden relative ${
              isMobileSearchOpen ? "text-primary bg-white/5" : "text-white/60 hover:text-white"
            }`}
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>



          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              suppressHydrationWarning
              className={`p-2.5 transition-colors relative ml-2 ${isNotificationsOpen ? "text-primary" : "text-white/60 hover:text-white"}`}
            >
              <Bell className="w-5 h-5" />
              {notifications.some(n => n.unread) && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-[#080808]" />
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-4 w-80 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-4 z-50"
                >
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-xs font-black uppercase tracking-widest">Notifications</h3>
                    <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">3 NEW</span>
                  </div>
                  <div className="space-y-2">
                    {notifications.map(notification => (
                      <div key={notification.id} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase tracking-tight text-primary">{notification.title}</span>
                          <span className="text-[9px] text-white/20 font-bold">{notification.time}</span>
                        </div>
                        <p className="text-[11px] text-white/60 leading-relaxed group-hover:text-white/80 transition-colors">
                          {notification.message}
                        </p>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors">
                    Mark all as read
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button suppressHydrationWarning className="w-10 h-10 ml-2 rounded-full overflow-hidden border border-white/10 hover:border-primary/50 transition-colors relative">
            <Image 
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80" 
              alt="Profile" 
              fill
              sizes="40px"
              className="object-cover"
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-card border-r border-white/5 z-[70] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="relative w-28 h-8 shrink-0">
                  <Image
                    src="/logo.png"
                    alt="AniShadow Logo"
                    fill
                    priority
                    sizes="112px"
                    className="object-contain object-left"
                  />
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-white/60" />
                </button>
              </div>

              {/* Mobile Brand Switcher */}
              <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/5 mb-8">
                <Link 
                  href="/" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex-1 py-2 rounded-lg text-center text-[9px] font-black uppercase tracking-widest transition-all ${!isMangaRoute ? 'bg-[#5c0606] text-white shadow-xl' : 'text-white/40'}`}
                >
                  Anime
                </Link>
                <Link 
                  href="/reader" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex-1 py-2 rounded-lg text-center text-[9px] font-black uppercase tracking-widest transition-all ${isMangaRoute ? 'bg-[#5b128c] text-white shadow-xl' : 'text-white/40'}`}
                >
                  Reader
                </Link>
              </div>

              <div className="flex flex-col gap-2">
                <Link href="/reader" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-primary/10 text-white/80 hover:text-primary font-bold transition-all uppercase tracking-widest text-xs">READER</Link>
                <Link href="/search" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-primary/10 text-white/80 hover:text-primary font-bold transition-all">GENRES</Link>
                <Link href="/trending" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-primary/10 text-white/80 hover:text-primary font-bold transition-all">TYPES</Link>
                <Link href="/popular" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-primary/10 text-white/80 hover:text-primary font-bold transition-all">NEW RELEASES</Link>
                <Link href="/trending" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-primary/10 text-white/80 hover:text-primary font-bold transition-all">UPDATES</Link>
                <Link href="/search?status=RELEASING" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-primary/10 text-white/80 hover:text-primary font-bold transition-all">ONGOING</Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Search Bar Slide Down */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border bg-card px-4 py-3 relative z-40 overflow-hidden"
          >
            <form onSubmit={handleSearch} className="relative w-full flex gap-2">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40 group-focus-within:text-primary transition-colors">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder={isMangaRoute ? "Search reader..." : "Search anime..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  suppressHydrationWarning
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-full pl-11 pr-4 text-sm focus:bg-white/10 focus:border-primary/50 focus:ring-0 transition-all outline-none"
                />
              </div>
              <button 
                type="button" 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                suppressHydrationWarning
                className={`h-11 px-4 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all border ${
                  isFilterOpen 
                    ? "bg-primary text-white border-primary" 
                    : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border-white/5"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Mobile Filter Dropdown */}
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-3 w-full z-50 pointer-events-auto"
                >
                  <div className="bg-card border border-border rounded-2xl shadow-2xl p-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                    <Suspense fallback={<div className="p-4 text-xs font-bold text-white/20 animate-pulse">Loading filters...</div>}>
                      <SearchFilters />
                    </Suspense>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar (Mobile) */}
      {!(pathname === '/watch' || pathname?.startsWith('/watch/')) && (
        <BottomTabBar 
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          isMangaRoute={isMangaRoute} 
        />
      )}

      <SearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
        isMangaRoute={isMangaRoute}
      />
    </header>
  );
}
