import React, { useEffect, useState, useRef } from 'react';
import { TRACK_RECORD_STATS, TECHNICAL_MILESTONES } from '../data/residences';

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
      className="relative w-full py-20 px-6 md:px-16 bg-[#f7f5f0] text-stone-900 border-t border-stone-200 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#E65100] tracking-widest uppercase mb-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#E65100]" />
              <span>DELIVERY LEDGER · EST. 2004</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-stone-900 tracking-tight">
              Two decades of uncompromised craft.
            </h2>
          </div>
          <p className="mt-3 md:mt-0 text-xs font-mono text-stone-500 max-w-xs">
            Over 1,200 waterfront residences and urban landmarks built to generational standards.
          </p>
        </div>

        {/* 4 Quantitative Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          <div className="p-6 bg-white border border-stone-200 shadow-sm">
            <div className="text-[10px] font-mono text-[#E65100] uppercase mb-1 font-bold">
              EST. 2004
            </div>
            <div className="text-4xl md:text-5xl font-mono font-bold text-stone-900 tabular-nums">
              {counts.years}
            </div>
            <div className="text-xs text-stone-600 mt-2">
              Years of Architectural Rigor
            </div>
          </div>

          <div className="p-6 bg-white border border-stone-200 shadow-sm">
            <div className="text-[10px] font-mono text-[#E65100] uppercase mb-1 font-bold">
              DELIVERED
            </div>
            <div className="text-4xl md:text-5xl font-mono font-bold text-stone-900 tabular-nums">
              {counts.homes}+
            </div>
            <div className="text-xs text-stone-600 mt-2">
              Masterpiece Residences
            </div>
          </div>

          <div className="p-6 bg-white border border-stone-200 shadow-sm">
            <div className="text-[10px] font-mono text-[#E65100] uppercase mb-1 font-bold">
              MASTERPLAN
            </div>
            <div className="text-4xl md:text-5xl font-mono font-bold text-stone-900 tabular-nums">
              {counts.sqm}k m²
            </div>
            <div className="text-xs text-stone-600 mt-2">
              Waterfront District Realm
            </div>
          </div>

          <div className="p-6 bg-white border border-stone-200 shadow-sm">
            <div className="text-[10px] font-mono text-[#E65100] uppercase mb-1 font-bold">
              ON-TIME RATE
            </div>
            <div className="text-4xl md:text-5xl font-mono font-bold text-stone-900 tabular-nums">
              {counts.rate}%
            </div>
            <div className="text-xs text-stone-600 mt-2">
              Exemplary Delivery Protocol
            </div>
          </div>
        </div>

        {/* 4 Clean Milestones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TECHNICAL_MILESTONES.map((m) => (
            <div key={m.step} className="p-5 bg-white border border-stone-200 shadow-sm">
              <div className="text-[11px] font-mono text-[#E65100] font-bold mb-1">
                {m.step} · {m.date}
              </div>
              <h3 className="text-base font-serif text-stone-900 mb-1">
                {m.title}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                {m.details}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
