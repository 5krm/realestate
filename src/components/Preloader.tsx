import React, { useEffect, useState } from 'react';

interface PreloaderProps {
  onComplete: () => void;
}

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(15);
  const [phaseText, setPhaseText] = useState('FOUNDATION DATUM...');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const phases = [
      { p: 30, text: 'FOUNDATION MAT ESTABLISHED...' },
      { p: 60, text: 'SUPERSTRUCTURE TOWERS RISING...' },
      { p: 85, text: 'WATERFRONT CANAL & ENCLOSURES...' },
      { p: 100, text: 'WATERFRONT DISTRICT READY — 100%' },
    ];

    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx++;
      if (currentIdx < phases.length) {
        setProgress(phases[currentIdx].p);
        setPhaseText(phases[currentIdx].text);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsDone(true);
          setTimeout(onComplete, 600);
        }, 400);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f4f2ee] text-stone-900 transition-all duration-700 ease-in-out ${
        isDone ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100'
      }`}
    >
      <div className="max-w-md w-full px-8 text-center">
        <div className="text-xs font-mono uppercase tracking-widest text-[#E65100] mb-3 font-semibold">
          VANGUARD &amp; STONE · MASTER DISTRICT
        </div>

        <h1 className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-tight mb-8">
          The Waterfront Realm
        </h1>

        {/* Minimal Progress Bar */}
        <div className="relative w-full h-1 bg-stone-200 overflow-hidden mb-4">
          <div
            className="absolute top-0 left-0 bottom-0 bg-[#E65100] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono text-stone-500">
          <span>{phaseText}</span>
          <span className="font-bold text-[#E65100]">{progress}%</span>
        </div>
      </div>
    </div>
  );
};
