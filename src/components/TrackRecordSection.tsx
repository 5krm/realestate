import React, { useEffect, useState, useRef } from 'react';
import { TECHNICAL_MILESTONES } from '../data/residences';

interface TrackRecordSectionProps {
  isVisible: boolean;
}

export const TrackRecordSection: React.FC<TrackRecordSectionProps> = ({ isVisible }) => {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [counts, setCounts] = useState({ years: 0, homes: 0, sqm: 0, rate: 0 });
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && !hasAnimated) {
      setHasAnimated(true);
      const duration = 1400;
      const startTime = performance.now();

      const animateCounts = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        setCounts({
          years: Math.floor(easeProgress * 22),
          homes: Math.floor(easeProgress * 1240),
          sqm: Math.floor(easeProgress * 485),
          rate: Number((easeProgress * 99.4).toFixed(1)),
        });

        if (progress < 1) {
          requestAnimationFrame(animateCounts);
        }
      };
      requestAnimationFrame(animateCounts);
    }
  }, [isVisible, hasAnimated]);

  return (
    <section
      ref={sectionRef}
      className={`fixed inset-0 pointer-events-none z-20 flex flex-col justify-center px-6 md:px-16 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
      }`}
    >
      <div className="max-w-5xl mx-auto w-full relative z-10 pointer-events-auto">
        {/* Floating Glass Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 p-6 bg-white/85 backdrop-blur-md border border-stone-200/90 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#E65100] tracking-widest uppercase mb-1 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#E65100] animate-pulse" />
              <span>DELIVERY LEDGER · EST. 2004</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-serif text-stone-900 tracking-tight">
              Two decades of uncompromised craft.
            </h2>
          </div>
          <p className="mt-2 md:mt-0 text-xs font-mono text-stone-600 max-w-xs">
            Over 1,200 waterfront residences and urban landmarks built to generational standards.
          </p>
        </div>

        {/* 4 Quantitative Stats in Glass Panels */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="p-5 bg-white/85 backdrop-blur-md border border-stone-200/90 shadow-lg">
            <div className="text-[10px] font-mono text-[#E65100] uppercase mb-1 font-bold">
              EST. 2004
            </div>
            <div className="text-3xl md:text-4xl font-mono font-bold text-stone-900 tabular-nums">
              {counts.years}
            </div>
            <div className="text-[11px] text-stone-600 mt-1">
              Years of Architectural Rigor
            </div>
          </div>

          <div className="p-5 bg-white/85 backdrop-blur-md border border-stone-200/90 shadow-lg">
            <div className="text-[10px] font-mono text-[#E65100] uppercase mb-1 font-bold">
              DELIVERED
            </div>
            <div className="text-3xl md:text-4xl font-mono font-bold text-stone-900 tabular-nums">
              {counts.homes}+
            </div>
            <div className="text-[11px] text-stone-600 mt-1">
              Masterpiece Residences
            </div>
          </div>

          <div className="p-5 bg-white/85 backdrop-blur-md border border-stone-200/90 shadow-lg">
            <div className="text-[10px] font-mono text-[#E65100] uppercase mb-1 font-bold">
              MASTERPLAN
            </div>
            <div className="text-3xl md:text-4xl font-mono font-bold text-stone-900 tabular-nums">
              {counts.sqm}k m²
            </div>
            <div className="text-[11px] text-stone-600 mt-1">
              Waterfront District Realm
            </div>
          </div>

          <div className="p-5 bg-white/85 backdrop-blur-md border border-stone-200/90 shadow-lg">
            <div className="text-[10px] font-mono text-[#E65100] uppercase mb-1 font-bold">
              ON-TIME RATE
            </div>
            <div className="text-3xl md:text-4xl font-mono font-bold text-stone-900 tabular-nums">
              {counts.rate}%
            </div>
            <div className="text-[11px] text-stone-600 mt-1">
              Exemplary Delivery Protocol
            </div>
          </div>
        </div>

        {/* 4 Clean Milestones in Frosted Glass Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TECHNICAL_MILESTONES.map((m) => (
            <div key={m.step} className="p-4 bg-white/85 backdrop-blur-md border border-stone-200/90 shadow-md">
              <div className="text-[10px] font-mono text-[#E65100] font-bold mb-1">
                {m.step} · {m.date}
              </div>
              <h3 className="text-sm font-serif font-medium text-stone-900 mb-1">
                {m.title}
              </h3>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                {m.details}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
