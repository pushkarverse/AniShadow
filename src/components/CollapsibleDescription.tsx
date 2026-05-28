"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleDescriptionProps {
  htmlContent: string;
}

export function CollapsibleDescription({ htmlContent }: CollapsibleDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative group">
      <div 
        className={`text-sm md:text-base text-white/60 font-medium leading-relaxed transition-all duration-300 cursor-default ${
          isExpanded ? "" : "line-clamp-3"
        }`}
        dangerouslySetInnerHTML={{ __html: htmlContent }} 
      />
      
      {!isExpanded && (
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#080808]/90 to-transparent pointer-events-none" />
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        {isExpanded ? (
          <>
            <span>Show Less</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </>
        ) : (
          <>
            <span>Read More</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </div>
  );
}
