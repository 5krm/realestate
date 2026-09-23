import React from 'react';

interface CraneRulerProps {
  scrollProgress: number;
  onJumpToProgress: (target: number) => void;
}

export const CraneRuler: React.FC<CraneRulerProps> = ({ scrollProgress, onJumpToProgress }) => {
  const currentHeight = Math.round(scrollProgress * 165);

  const keyLevels = [
    { label: '+165m SKYLINE', progress: 0.95 },
    { label: '+110m MID-RISE', progress: 0.65 },
    { label: '+45m PODIUM', progress: 0.35 },
    { label: '+0m GROUND', progress: 0.05 },
  ];

  return (
    <div className="fixed right-4 top-24 bottom-16 w-16 z-30 hidden lg:flex flex-col items-end pointer-events-none select-none">
      <div className="relative h-full w-8 border-r border-stone-300 flex flex-col justify-between py-2 pointer-events-auto">
        {/* Metric tick marks */}
        {Array.from({ length: 20 }).map((_, i) => {
          const isMajor = i % 4 === 0;
          return (
            <div
              key={i}
              className={`h-[1px] ml-auto ${
                isMajor ? 'w-4 bg-stone-400' : 'w-2 bg-stone-300'
              }`}
            />
          );
        })}

        {/* Clickable markers */}
        {keyLevels.map((lvl) => (
          <button
            key={lvl.label}
            onClick={() => onJumpToProgress(lvl.progress)}
            className="absolute right-3 text-[9px] font-mono text-stone-500 hover:text-[#E65100] transition-colors whitespace-nowrap -translate-y-1/2 cursor-pointer pointer-events-auto"
            style={{ top: `${(1 - lvl.progress) * 92 + 4}%` }}
          >
            {lvl.label}
          </button>
        ))}

        {/* Needle */}
        <div
          className="absolute right-0 -mr-[1px] flex items-center transition-all duration-150 ease-out pointer-events-none"
          style={{
            top: `${Math.max(0.02, Math.min(0.98, 1 - scrollProgress)) * 100}%`,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="mr-2 px-1.5 py-0.5 bg-[#E65100] text-white text-[10px] font-mono font-bold tracking-wider shadow-md">
            +{currentHeight}m
          </div>
          <div className="w-2 h-2 bg-[#E65100] rotate-45 -mr-1" />
        </div>
      </div>
    </div>
  );
};
