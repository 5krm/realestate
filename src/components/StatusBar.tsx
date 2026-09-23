import React, { useEffect, useRef } from 'react';
import { useUI } from '../state/store';
import { scrollEngine } from '../lib/scrollEngine';

/**
 * Bottom-left telemetry strip: quality badge, coordinates, journey progress.
 * Gives the site its "instrument panel" soul.
 */
export const StatusBar: React.FC = () => {
  const quality = useUI((s) => s.quality);
  const blueprint = useUI((s) => s.blueprint);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return scrollEngine.onFrame((p) => {
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
    });
  }, []);

  const qColor = quality === 'high' ? 'bg-emerald-500' : quality === 'medium' ? 'bg-amber-500' : 'bg-red-400';

  return (
    <>
      <div className="fixed left-4 bottom-4 z-30 hidden md:flex items-center gap-3 text-[9px] font-mono uppercase tracking-[0.2em] text-stone-500 pointer-events-none select-none">
        <span className="flex items-center gap-1.5" title="Adaptive render quality">
          <span className={`w-1.5 h-1.5 rounded-full ${qColor}`} />
          {quality}
        </span>
        <span className="text-stone-300">/</span>
        <span>{blueprint ? 'Blueprint X-Ray' : 'Cinematic'}</span>
        <span className="text-stone-300">/</span>
        <span className="text-stone-400">51.9225° N · 4.4792° E</span>
      </div>

      {/* total journey progress, bottom edge */}
      <div className="fixed bottom-0 left-0 right-0 h-[2px] z-30 pointer-events-none bg-stone-900/5">
        <div ref={fillRef} className="h-full w-full bg-[#E65100]/70 origin-left" style={{ transform: 'scaleX(0)' }} />
      </div>
    </>
  );
};
