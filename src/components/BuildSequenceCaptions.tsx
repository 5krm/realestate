import React from 'react';
import { BUILD_PHASES } from '../data/residences';

interface BuildSequenceCaptionsProps {
  scrollProgress: number;
  onSelectPhase: (phaseIdx: number) => void;
}

export const BuildSequenceCaptions: React.FC<BuildSequenceCaptionsProps> = ({
  scrollProgress,
  onSelectPhase,
}) => {
  // Only display during the pinned build sequence (0.12 to 0.54)
  if (scrollProgress < 0.10 || scrollProgress > 0.54) return null;

  let activePhaseIdx = BUILD_PHASES.findIndex(
    (p) => scrollProgress >= p.scrollRange[0] && scrollProgress <= p.scrollRange[1]
  );
  if (activePhaseIdx === -1) {
    if (scrollProgress < BUILD_PHASES[0].scrollRange[0]) activePhaseIdx = 0;
    else activePhaseIdx = BUILD_PHASES.length - 1;
  }

  const phase = BUILD_PHASES[activePhaseIdx];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-12">
      {/* Top Phase Tabs */}
      <div className="flex items-center gap-2 pointer-events-auto mt-16">
        {BUILD_PHASES.map((p, idx) => (
          <button
            key={p.number}
            onClick={() => onSelectPhase(idx)}
            className={`px-3 py-1.5 text-xs font-mono transition-all border ${
              activePhaseIdx === idx
                ? 'bg-[#E65100] text-white border-[#E65100] font-bold shadow-sm'
                : 'bg-white/80 text-stone-600 border-stone-200 hover:text-stone-900 backdrop-blur-sm'
            }`}
          >
            <span>{p.number}</span>
          </button>
        ))}
      </div>

      {/* Elegant Minimal Phase Card */}
      <div className="max-w-md bg-white/90 backdrop-blur-md border border-stone-200/90 p-5 md:p-6 shadow-xl pointer-events-auto mb-10 transition-all">
        <div className="flex items-center justify-between mb-2 text-xs font-mono">
          <span className="text-[#E65100] font-bold tracking-wider">{phase.code}</span>
          <span className="text-stone-500">{phase.elevation}</span>
        </div>

        <h2 className="text-xl md:text-2xl font-serif text-stone-900 mb-2 leading-tight">
          {phase.title}
        </h2>

        <p className="text-xs md:text-sm text-stone-600 leading-relaxed">
          {phase.description}
        </p>
      </div>
    </div>
  );
};
