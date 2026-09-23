import React, { useEffect, useRef } from 'react';
import { ArrowRight, MousePointer2 } from 'lucide-react';
import { scrollEngine } from '../lib/scrollEngine';

export const HeroOverlay: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // fade out as we leave the hero, without any React re-renders
  useEffect(() => {
    return scrollEngine.onFrame((p) => {
      const el = rootRef.current;
      if (!el) return;
      const fade = Math.min(1, Math.max(0, (p - 0.035) / 0.05));
      el.style.opacity = String(1 - fade);
      el.style.transform = `translateY(${fade * -34}px)`;
      el.style.pointerEvents = fade > 0.4 ? 'none' : 'auto';
    });
  }, []);

  return (
    <div ref={rootRef} className="fixed inset-0 z-20 flex flex-col justify-end p-6 md:p-12 pb-10">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.25em] uppercase mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E65100] animate-pulse" />
          <span className="font-bold text-stone-900">River District</span>
          <span className="text-stone-400">/</span>
          <span className="text-stone-500">3 towers · 165 m · 2027</span>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif text-stone-900 leading-[0.95] tracking-tight mb-6">
          Live above
          <br />
          the river<span className="text-[#E65100]">.</span>
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => scrollEngine.scrollToSection('residences')}
            className="group flex items-center gap-2.5 px-6 py-3.5 bg-[#E65100] hover:bg-[#D84300] text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20"
          >
            Explore residences
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => scrollEngine.scrollToSection('build')}
            className="px-6 py-3.5 bg-white/85 hover:bg-white backdrop-blur-sm border border-stone-900/10 text-stone-800 text-xs font-bold uppercase tracking-widest transition-all"
          >
            Watch it rise
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 md:right-12 hidden sm:flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-stone-500">
        <MousePointer2 className="w-3 h-3 text-[#E65100]" />
        <span>Scroll — the city builds itself</span>
      </div>

      <div ref={barRef} className="absolute bottom-0 left-0 right-0 h-[2px]">
        <div className="h-full w-full bg-gradient-to-r from-[#E65100] to-transparent opacity-60" />
      </div>
    </div>
  );
};
