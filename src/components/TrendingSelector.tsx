"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type TrendingPeriod = "NOW" | "DAY" | "WEEK" | "MONTH";

interface TrendingSelectorProps {
  value: TrendingPeriod;
  onChange: (value: TrendingPeriod) => void;
}

const periods: TrendingPeriod[] = ["NOW", "DAY", "WEEK", "MONTH"];

export function TrendingSelector({ value, onChange }: TrendingSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#ff4a4a] hover:bg-[#ff3535] text-white text-[10px] font-black rounded-lg transition-all shadow-lg shadow-[#ff4a4a]/20 uppercase tracking-widest group"
      >
        <span>{value}</span>
        {isOpen ? (
          <ChevronUp className="w-3 h-3 transition-transform" />
        ) : (
          <ChevronDown className="w-3 h-3 transition-transform" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 mt-1 w-32 bg-[#121212] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="py-1 flex flex-col">
              {periods.map((period) => (
                <button
                  key={period}
                  suppressHydrationWarning
                  onClick={() => {
                    onChange(period);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-left transition-colors ${
                    value === period
                      ? "bg-yellow-500 text-black"
                      : "text-white/40 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
