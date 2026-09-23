import React from 'react';
import { Train, Trees, Waves, Coffee, Footprints } from 'lucide-react';
import { NEIGHBORHOOD_PINS } from '../data/residences';
import { store, useUI } from '../state/store';

const ICONS: Record<string, React.ReactNode> = {
  transit: <Train className="w-4 h-4" />,
  nature: <Trees className="w-4 h-4" />,
  water: <Waves className="w-4 h-4" />,
  culinary: <Coffee className="w-4 h-4" />,
};

export const DistrictOverlay: React.FC = () => {
  const activePinId = useUI((s) => s.activePinId);
  const pin = NEIGHBORHOOD_PINS.find((p) => p.id === activePinId) || NEIGHBORHOOD_PINS[0];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-end items-center p-6 md:p-10 pb-12">
      <div className="pointer-events-auto flex flex-col items-center gap-3">
        {/* active amenity readout — one line only */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white/85 backdrop-blur-md border border-stone-900/10 shadow-xl">
          <Footprints className="w-3.5 h-3.5 text-[#E65100]" />
          <span className="text-xs font-semibold text-stone-900">{pin.name}</span>
          <span className="text-[10px] font-mono text-emerald-700 font-bold">{pin.walkTime}</span>
        </div>

        {/* amenity chips */}
        <div className="flex flex-wrap justify-center items-center gap-1.5 p-1.5 bg-white/85 backdrop-blur-md border border-stone-900/10 shadow-xl max-w-[94vw]">
          {NEIGHBORHOOD_PINS.map((p) => {
            const on = p.id === activePinId;
            return (
              <button
                key={p.id}
                onClick={() => store.set({ activePinId: p.id })}
                className={`flex items-center gap-2 px-3.5 py-2.5 transition-all ${
                  on ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span className={on ? 'text-[#ff8a3d]' : 'text-[#E65100]'}>{ICONS[p.category]}</span>
                <span className="text-[11px] font-bold uppercase tracking-wider">{p.short}</span>
              </button>
            );
          })}
        </div>

        <div className="text-[9px] font-mono uppercase tracking-[0.3em] text-stone-500/90 bg-white/60 backdrop-blur-sm px-3 py-1">
          Route drawn from your tower — pick a beacon
        </div>
      </div>
    </div>
  );
};
