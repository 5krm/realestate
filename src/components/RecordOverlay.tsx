import React, { useEffect, useState } from 'react';
import { RECORD_STATS } from '../data/residences';

function useCountUp(run: boolean, target: number, decimals = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1300);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Number((e * target).toFixed(decimals)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, decimals]);
  return v;
}

const Stat: React.FC<{ run: boolean; value: number; suffix: string; label: string; kicker: string; decimals?: number }> = ({
  run,
  value,
  suffix,
  label,
  kicker,
  decimals = 0,
}) => {
  const v = useCountUp(run, value, decimals);
  return (
    <div className="bg-white/80 backdrop-blur-md border border-stone-900/10 shadow-xl px-4 py-4 md:px-6 md:py-5">
      <div className="text-[9px] font-mono font-bold tracking-[0.25em] text-[#E65100] uppercase">{kicker}</div>
      <div className="text-3xl md:text-5xl font-mono font-bold text-stone-900 tabular-nums leading-tight">
        {v.toLocaleString()}
        <span className="text-[#E65100]">{suffix}</span>
      </div>
      <div className="text-[11px] font-medium text-stone-500">{label}</div>
    </div>
  );
};

export const RecordOverlay: React.FC = () => {
  const [run, setRun] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRun(true), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-center p-6 md:p-12">
      <div className="max-w-4xl">
        <div className="text-[10px] font-mono font-bold tracking-[0.3em] text-[#E65100] uppercase mb-2">
          Since 2004
        </div>
        <h2 className="text-4xl md:text-6xl font-serif text-stone-900 tracking-tight leading-[0.95] mb-7 drop-shadow-sm">
          Built. Delivered.
          <br />
          On time<span className="text-[#E65100]">.</span>
        </h2>

        <div className="pointer-events-auto grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
          {RECORD_STATS.map((s) => (
            <Stat
              key={s.label}
              run={run}
              value={s.value}
              suffix={s.suffix}
              label={s.label}
              kicker={s.kicker}
              decimals={s.value % 1 !== 0 ? 1 : 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
