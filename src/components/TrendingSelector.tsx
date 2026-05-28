"use client";

import { useMemo } from "react";

export type TrendingPeriod = "NOW" | "DAY" | "WEEK" | "MONTH";

interface TrendingSelectorProps {
  value: TrendingPeriod;
  onChange: (value: TrendingPeriod) => void;
}

const periods: TrendingPeriod[] = ["DAY", "WEEK", "MONTH"];

export function TrendingSelector({ value, onChange }: TrendingSelectorProps) {
  const normalizedValue = useMemo(() => (value === "NOW" ? "DAY" : value), [value]);

  return (
    <div className="flex items-center gap-1 rounded-xl border border-white/5 bg-white/5 p-1">
      {periods.map((period) => (
        <button
          key={period}
          type="button"
          suppressHydrationWarning
          onClick={() => onChange(period)}
          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
            normalizedValue === period
              ? "bg-primary text-white shadow-lg"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          {period}
        </button>
      ))}
    </div>
  );
}
