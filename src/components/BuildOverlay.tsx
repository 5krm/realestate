import React, { useEffect, useRef } from 'react';
import { BUILD_PHASES, PHASE_RANGES } from '../data/residences';
import { scrollEngine } from '../lib/scrollEngine';

const BUILD_RANGE: [number, number] = [0.10, 0.46];

export const BuildOverlay: React.FC = () => {
  const barRef = useRef<HTMLDivElement>(null);
  const elevRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastPhase = useRef(-1);

  // imperatively sync the phase caption + progress bar each frame
  useEffect(() => {
    return scrollEngine.onFrame((p) => {
      const buildT = Math.min(1, Math.max(0, (p - BUILD_RANGE[0]) / (BUILD_RANGE[1] - BUILD_RANGE[0])));
      if (barRef.current) barRef.current.style.transform = `scaleX(${buildT})`;

      let idx = PHASE_RANGES.findIndex(([a, b]) => p >= a && p < b);
      if (idx === -1) idx = p < PHASE_RANGES[0][0] ? 0 : BUILD_PHASES.length - 1;

      if (idx !== lastPhase.current) {
        lastPhase.current = idx;
        const phase = BUILD_PHASES[idx];
        if (titleRef.current) titleRef.current.textContent = phase.title;
        if (elevRef.current) elevRef.current.textContent = phase.elevation;
        if (codeRef.current) codeRef.current.textContent = `${phase.number} · ${phase.code}`;
        dotRefs.current.forEach((d, i) => {
          if (!d) return;
          d.className =
            i === idx
              ? 'w-6 h-1.5 bg-[#E65100] transition-all'
              : 'w-1.5 h-1.5 bg-stone-300 hover:bg-stone-500 transition-all';
        });
      }
    });
  }, []);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-end p-6 md:p-12 pb-12">
      {/* phase dots — jump control */}
      <div className="pointer-events-auto flex items-center gap-2 mb-3">
        {BUILD_PHASES.map((ph, i) => (
          <button
            key={ph.number}
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            title={ph.title}
            onClick={() => {
              const [a, b] = PHASE_RANGES[i];
              scrollEngine.scrollTo((a + b) / 2);
            }}
            className={i === 0 ? 'w-6 h-1.5 bg-[#E65100] transition-all' : 'w-1.5 h-1.5 bg-stone-300 hover:bg-stone-500 transition-all'}
          />
        ))}
      </div>

      <div className="max-w-lg">
        <div ref={codeRef} className="text-[10px] font-mono font-bold tracking-[0.3em] text-[#E65100] uppercase mb-1">
          01 · DATUM
        </div>
        <div className="flex items-end gap-4">
          <h2 ref={titleRef} className="text-4xl md:text-6xl font-serif text-stone-900 leading-none tracking-tight">
            Foundations
          </h2>
          <span ref={elevRef} className="text-lg md:text-2xl font-mono text-stone-400 tabular-nums pb-0.5">
            +0m
          </span>
        </div>

        {/* build progress */}
        <div className="mt-5 h-[3px] w-64 max-w-full bg-stone-900/10 overflow-hidden">
          <div ref={barRef} className="h-full w-full bg-[#E65100] origin-left" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
    </div>
  );
};
