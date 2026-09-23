import React, { useEffect, useState } from 'react';
import { useUI } from '../state/store';

interface PreloaderProps {
  onComplete: () => void;
}

const MIN_TIME = 1400;

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const sceneReady = useUI((s) => s.sceneReady);
  const [progress, setProgress] = useState(4);
  const [phase, setPhase] = useState('SETTING DATUM');
  const [closing, setClosing] = useState(false);

  // lock scroll while loading
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // fake-but-bounded progress until the real scene reports ready
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => {
      setProgress((p) => {
        const elapsed = performance.now() - t0;
        const cap = sceneReady && elapsed > MIN_TIME ? 100 : 88;
        const next = Math.min(cap, p + 2 + Math.random() * 4);
        if (next > 30 && next < 55) setPhase('RAISING CORES');
        else if (next >= 55 && next < 80) setPhase('GLAZING FAÇADES');
        else if (next >= 80) setPhase('WATER IN THE CANAL');
        return next;
      });
    }, 110);
    return () => clearInterval(id);
  }, [sceneReady]);

  useEffect(() => {
    if (progress >= 100) {
      setPhase('DISTRICT READY');
      const t = setTimeout(() => {
        setClosing(true);
        setTimeout(onComplete, 650);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [progress, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#f4f2ec] transition-all duration-700 ease-in-out ${
        closing ? 'opacity-0 pointer-events-none scale-[1.03]' : 'opacity-100'
      }`}
    >
      <div className="w-[280px] text-center">
        <div className="text-[10px] font-mono font-bold uppercase tracking-[0.35em] text-[#E65100] mb-3">
          Vanguard · Stone
        </div>
        <h1 className="text-3xl font-serif text-stone-900 tracking-tight mb-8">The River District</h1>

        <div className="relative h-px bg-stone-900/15 mb-3 overflow-visible">
          <div
            className="absolute left-0 top-0 h-px bg-[#E65100] transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
          {/* crane trolley marker riding the bar */}
          <div
            className="absolute -top-[9px] w-[7px] h-[9px] bg-stone-900 transition-all duration-150"
            style={{ left: `calc(${progress}% - 3px)` }}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.25em] text-stone-400">
          <span>{phase}</span>
          <span className="text-stone-900 font-bold tabular-nums">{Math.floor(progress)}%</span>
        </div>
      </div>
    </div>
  );
};
