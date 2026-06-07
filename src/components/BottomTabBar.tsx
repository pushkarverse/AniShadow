"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, BookOpen, Heart, Menu } from "lucide-react";
import { motion } from "framer-motion";

interface BottomTabBarProps {
  onMenuToggle: () => void;
  isMangaRoute: boolean;
}

export function BottomTabBar({ onMenuToggle, isMangaRoute }: BottomTabBarProps) {
  const pathname = usePathname();

  const tabs = [
    { 
      label: "Home", 
      href: "/", 
      icon: Home, 
      active: pathname === "/" 
    },
    { 
      label: "Reader", 
      href: "/reader", 
      icon: BookOpen, 
      active: pathname?.startsWith("/reader") 
    },
    { 
      label: "Search", 
      href: isMangaRoute ? "/anime/search?type=MANGA" : "/anime/search", 
      icon: Search, 
      active: pathname?.startsWith("/anime/search") 
    },
    { 
      label: "Library", 
      href: "/watchlist", 
      icon: Heart, 
      active: pathname?.startsWith("/watchlist") 
    },
    { 
      label: "More", 
      onClick: onMenuToggle, 
      icon: Menu, 
      active: false 
    }
  ];

  // Active theme color
  const activeColorClass = isMangaRoute ? "text-[#9d4edd]" : "text-[#991b1b]";
  const activeBgClass = isMangaRoute ? "bg-[#5b128c]/10" : "bg-[#5c0606]/10";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#080808]/90 backdrop-blur-xl border-t border-white/5 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.7)] flex items-center justify-around">
      {tabs.map((tab, idx) => {
        const Icon = tab.icon;
        const isActive = tab.active;

        const content = (
          <motion.div 
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl relative"
            whileTap={{ scale: 0.92 }}
          >
            {/* Animated background pill */}
            {isActive && (
              <motion.div
                layoutId="activeTabBackground"
                className={`absolute inset-0 rounded-xl ${activeBgClass} -z-10`}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            
            <Icon 
              className={`w-5 h-5 transition-colors duration-200 ${
                isActive ? activeColorClass : "text-white/40 group-hover:text-white/80"
              }`} 
            />
            
            <span className={`text-[9px] font-black uppercase tracking-wider transition-colors duration-200 ${
              isActive ? "text-white" : "text-white/30"
            }`}>
              {tab.label}
            </span>

            {/* Glowing dot for active status */}
            {isActive && (
              <motion.div
                layoutId="activeTabDot"
                className={`absolute -bottom-1.5 w-1 h-1 rounded-full ${
                  isMangaRoute ? "bg-[#5b128c]" : "bg-[#5c0606]"
                } shadow-[0_0_8px_currentColor]`}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </motion.div>
        );

        if (tab.href) {
          return (
            <Link 
              key={`bottom-tab-${idx}`} 
              href={tab.href}
              className="flex-1 flex justify-center group"
            >
              {content}
            </Link>
          );
        }

        return (
          <button 
            key={`bottom-tab-${idx}`} 
            onClick={tab.onClick}
            className="flex-1 flex justify-center group outline-none focus:outline-none cursor-pointer"
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
