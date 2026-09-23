import React, { useEffect, useRef } from 'react';
import { scrollEngine, SECTIONS } from '../lib/scrollEngine';

/**
 * Slim right-edge elevation gauge: section ticks + climbing height needle,
 * driven imperatively at 60fps with no React state.
 */
export const ElevationGauge: React.FC = () => {
  const needleRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return scrollEngine.onFrame((p) => {
      const needle = needleRef.current;
      if (needle) needle.style.top = `${(1 - p) * 100}%`;
      if (labelRef.current) {
        const h = Math.round(p * 165);
        const txt = `+${h}m`;
        if (labelRef.current.textContent !== txt) labelRef.current.textContent = txt;
      }
    });
  }, []);

  return (
    <div className="fixed right-3 top-1/2 -translate-y-1/2 h-[46vh] z-30 hidden lg:flex items-stretch pointer-events-none select-none">
      <div className="relative w-px bg-stone-900/15">
        {/* section jump ticks */}
        {SECTIONS.map((s) => {
          const mid = (s.range[0] + s.range[1]) / 2;
          return (
            <button
              key={s.id}
              title={s.label}
              onClick={() => scrollEngine.scrollToSection(s.id)}
              className="group absolute -right-1 w-3 h-3 pointer-events-auto flex items-center justify-center"
              style={{ top: `${(1 - mid) * 100}%`, transform: 'translateY(-50%)' }}
            >
              <span className="block w-1.5 h-1.5 rounded-full bg-stone-400 group-hover:bg-[#E65100] group-hover:scale-150 transition-all" />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-mono uppercase tracking-widest text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 px-1.5 py-0.5">
                {s.label}
              </span>
            </button>
          );
        })}

        {/* needle */}
        <div ref={needleRef} className="absolute -left-1.5 flex items-center" style={{ top: '100%', transform: 'translateY(-50%)' }}>
          <span
            ref={labelRef}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-[#E65100] tabular-nums"
          >
            +0m
          </span>
          <span className="block w-3 h-[2px] bg-[#E65100]" />
        </div>
      </div>
    </div>
  );
};
