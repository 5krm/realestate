import React from 'react';
import { Heart, Layers, MousePointerClick, Move3d, ArrowRight } from 'lucide-react';
import { RESIDENCE_PROJECTS } from '../data/residences';
import { store, useUI } from '../state/store';
import { scrollEngine } from '../lib/scrollEngine';

export const ResidencesOverlay: React.FC = () => {
  const activeProjectId = useUI((s) => s.activeProjectId);
  const exploded = useUI((s) => s.exploded);
  const saved = useUI((s) => s.savedHomes);
  const selectedFloor = useUI((s) => s.selectedFloor);

  const project = RESIDENCE_PROJECTS.find((p) => p.id === activeProjectId) || RESIDENCE_PROJECTS[0];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-8 pt-16 md:pt-20">
      {/* top: project tabs + exploded toggle */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-1 p-1 bg-white/85 backdrop-blur-md border border-stone-900/10 shadow-lg">
          {RESIDENCE_PROJECTS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                store.set({ activeProjectId: p.id, selectedFloor: null });
              }}
              className={`px-3 md:px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                p.id === activeProjectId ? 'bg-[#E65100] text-white shadow-sm' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => store.set({ exploded: !exploded })}
          className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 text-[10px] font-mono uppercase tracking-widest border transition-all shadow-lg ${
            exploded
              ? 'bg-stone-900 text-white border-stone-900'
              : 'bg-white/85 backdrop-blur-md text-stone-700 border-stone-900/10'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#E65100]" />
          <span>{exploded ? 'Exploded' : 'Assembled'}</span>
        </button>
      </div>

      {/* bottom: unit stack card */}
      <div className="flex items-end justify-between gap-4">
        <div className="pointer-events-auto w-full max-w-sm bg-white/88 backdrop-blur-md border border-stone-900/10 shadow-2xl">
          {/* project header — minimal */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-stone-900/8">
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#E65100] font-bold">{project.tagline}</div>
              <div className="text-xl font-serif text-stone-900 leading-tight">{project.name}</div>
            </div>
            <div className="text-right text-[10px] font-mono text-stone-500">
              <div>from {project.startingPrice}</div>
              <div className="text-emerald-700 font-bold">{project.availability}</div>
            </div>
          </div>

          {/* floor rows */}
          <div className="max-h-52 overflow-y-auto">
            {project.floors.map((f) => {
              const isSaved = saved.includes(`${project.id}:${f.floorNumber}`);
              const isHot = selectedFloor === f.floorNumber;
              return (
                <div
                  key={f.floorNumber}
                  onMouseEnter={() => store.set({ selectedFloor: f.floorNumber })}
                  onMouseLeave={() => store.set({ selectedFloor: null })}
                  onClick={() => store.set({ modalFloor: { projectId: project.id, floorNumber: f.floorNumber } })}
                  className={`group w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors border-b border-stone-900/5 last:border-0 ${
                    isHot ? 'bg-orange-50' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className={`text-[10px] font-mono w-8 shrink-0 ${isHot ? 'text-[#E65100] font-bold' : 'text-stone-400'}`}>
                    L{String(f.floorNumber).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-stone-900 truncate">{f.name}</div>
                    <div className="text-[10px] font-mono text-stone-500">
                      {f.areaSqm} m² · {f.bedrooms} bd
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-stone-900 whitespace-nowrap">{f.price}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      store.toggleSaved(project.id, f.floorNumber);
                    }}
                    title="Save home"
                    className="p-1.5 rounded-full hover:bg-stone-200/70 transition-colors shrink-0"
                  >
                    <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#E65100] text-[#E65100]' : 'text-stone-400'}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* interaction hints */}
        <div className="hidden md:flex flex-col items-end gap-2 text-[10px] font-mono uppercase tracking-widest text-stone-500">
          <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-3 py-1.5 border border-stone-900/5">
            <Move3d className="w-3 h-3 text-[#E65100]" /> Drag to orbit
          </div>
          <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-3 py-1.5 border border-stone-900/5">
            <MousePointerClick className="w-3 h-3 text-[#E65100]" /> Click a glowing floor
          </div>
          <button
            onClick={() => scrollEngine.scrollToSection('contact')}
            className="pointer-events-auto group flex items-center gap-2 px-4 py-2 bg-stone-900 text-white uppercase tracking-widest hover:bg-[#E65100] transition-colors"
          >
            Private tour <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
