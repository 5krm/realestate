import React from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';

interface HeroOverlayProps {
  onExploreResidences: () => void;
  onWatchItRise: () => void;
  opacity: number;
}

export const HeroOverlay: React.FC<HeroOverlayProps> = ({
  onExploreResidences,
  onWatchItRise,
  opacity,
}) => {
  if (opacity <= 0.02) return null;

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-12 transition-opacity duration-300"
      style={{ opacity }}
    >
      <div className="h-16" />

      {/* Main Center-Left Headline */}
      <div className="max-w-2xl pointer-events-auto mt-auto mb-10">
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#E65100] uppercase mb-3">
          <span className="w-2 h-2 rounded-full bg-[#E65100]" />
          <span className="font-semibold">WATERFRONT MASTER DISTRICT</span>
          <span className="text-stone-300">·</span>
          <span className="text-stone-500 font-medium">EST. 2004</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-normal text-stone-900 leading-[1.08] tracking-tight mb-5 text-balance">
          Architecture for generations.
        </h1>

        <p className="text-base sm:text-lg text-stone-600 font-normal max-w-lg leading-relaxed mb-7">
          A sunlit riverfront metropolis masterplanned with architectural integrity, private marinas, and green urban parklands.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onExploreResidences}
            className="group flex items-center gap-2.5 px-6 py-3.5 bg-[#E65100] hover:bg-[#D84300] text-white text-xs md:text-sm font-semibold tracking-wide transition-all shadow-md"
          >
            <span>Explore Residences</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={onWatchItRise}
            className="group flex items-center gap-2.5 px-6 py-3.5 bg-white/90 hover:bg-white text-stone-800 border border-stone-200 text-xs md:text-sm font-medium tracking-wide transition-all shadow-sm backdrop-blur-sm"
          >
            <span>Watch City Rise</span>
            <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-1 text-[#E65100]" />
          </button>
        </div>
      </div>

      {/* Bottom Status Hint */}
      <div className="flex items-center justify-between text-xs font-mono text-stone-500 border-t border-stone-200/80 pt-3 pointer-events-auto">
        <div className="flex items-center gap-3">
          <span>RIVER DISTRICT · CENTRAL PLAZA</span>
          <span className="text-stone-300">/</span>
          <span>DAYTIME 22°C CLEAR SKY</span>
        </div>
        <div className="flex items-center gap-2 text-[#E65100] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E65100] animate-pulse" />
          <span>SCROLL TO EXPLORE MASTERPLAN</span>
        </div>
      </div>
    </div>
  );
};
