import React, { useMemo, useState } from 'react';
import { X, Heart, ArrowRight } from 'lucide-react';
import { store, useUI } from '../state/store';
import { PROJECT_BY_ID } from '../data/residences';
import { scrollEngine } from '../lib/scrollEngine';

const fmtEUR = (v: number) =>
  '€' + Math.round(v).toLocaleString('en-IE', { maximumFractionDigits: 0 });

export const FloorPlanModal: React.FC = () => {
  const modal = useUI((s) => s.modalFloor);
  const saved = useUI((s) => s.savedHomes);
  const [hotRoom, setHotRoom] = useState<string | null>(null);
  const [downPct, setDownPct] = useState(25);
  const [years, setYears] = useState(25);

  const project = modal ? PROJECT_BY_ID[modal.projectId] : null;
  const floor = project?.floors.find((f) => f.floorNumber === modal?.floorNumber);

  const monthly = useMemo(() => {
    if (!floor) return 0;
    const principal = floor.priceEUR * (1 - downPct / 100);
    const r = 0.036 / 12;
    const n = years * 12;
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [floor, downPct, years]);

  if (!modal || !project || !floor) return null;

  const isSaved = saved.includes(`${project.id}:${floor.floorNumber}`);
  const planW = Math.max(...floor.rooms.map((r) => r.at[0] + r.size[0]));
  const planD = Math.max(...floor.rooms.map((r) => r.at[1] + r.size[1]));
  const S = 34; // svg scale px per meter
  const pad = 14;
  const activeRoom = floor.rooms.find((r) => r.id === hotRoom);

  const close = () => store.set({ modalFloor: null });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-8 bg-stone-950/55 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="relative w-full max-w-5xl bg-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-stone-900/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-900/10 bg-stone-50 shrink-0">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="text-[10px] font-mono font-bold text-[#E65100] uppercase tracking-widest shrink-0">
              L{String(floor.floorNumber).padStart(2, '0')} · {project.name}
            </span>
            <h3 className="text-lg md:text-xl font-serif text-stone-900 truncate">{floor.name}</h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => store.toggleSaved(project.id, floor.floorNumber)}
              title="Save home"
              className="p-2 rounded-full hover:bg-stone-200 transition-colors"
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-[#E65100] text-[#E65100]' : 'text-stone-500'}`} />
            </button>
            <button onClick={close} className="p-2 rounded-full hover:bg-stone-200 transition-colors">
              <X className="w-4 h-4 text-stone-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12">
          {/* SVG floor plan */}
          <div className="md:col-span-7 bg-[#f6f4ef] flex flex-col items-center justify-center p-5 select-none">
            <svg
              viewBox={`0 0 ${planW * S + pad * 2} ${planD * S + pad * 2}`}
              className="w-full max-w-[520px] drop-shadow-sm"
            >
              {/* slab outline */}
              <rect
                x={pad - 4}
                y={pad - 4}
                width={planW * S + 8}
                height={planD * S + 8}
                fill="#e8e3d8"
                stroke="#8a8577"
                strokeWidth="2.5"
              />
              {floor.rooms.map((room) => {
                const hot = hotRoom === room.id;
                const isTerrace = room.id.includes('terrace');
                return (
                  <g
                    key={room.id}
                    onMouseEnter={() => setHotRoom(room.id)}
                    onMouseLeave={() => setHotRoom(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={pad + room.at[0] * S}
                      y={pad + room.at[1] * S}
                      width={room.size[0] * S}
                      height={room.size[1] * S}
                      fill={hot ? '#E65100' : isTerrace ? '#cfd8cc' : '#efe9dd'}
                      stroke={hot ? '#b23f00' : '#b8b2a4'}
                      strokeWidth="1.5"
                      style={{ transition: 'fill 0.15s' }}
                    />
                    <text
                      x={pad + (room.at[0] + room.size[0] / 2) * S}
                      y={pad + (room.at[1] + room.size[1] / 2) * S}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pointer-events-none font-mono"
                      fontSize="11"
                      fill={hot ? '#fff' : '#57534e'}
                      fontWeight={700}
                    >
                      {room.name}
                    </text>
                    <text
                      x={pad + (room.at[0] + room.size[0] / 2) * S}
                      y={pad + (room.at[1] + room.size[1] / 2) * S + 14}
                      textAnchor="middle"
                      className="pointer-events-none font-mono"
                      fontSize="9"
                      fill={hot ? '#ffe4c7' : '#a8a29e'}
                    >
                      {room.areaSqm} m²
                    </text>
                  </g>
                );
              })}
              {/* north arrow */}
              <g transform={`translate(${planW * S - 6}, ${pad + 10})`}>
                <circle r="11" fill="#fff" stroke="#b8b2a4" />
                <path d="M0,-7 L4,5 L0,2 L-4,5 Z" fill="#E65100" />
              </g>
            </svg>
            <div className="text-[9px] font-mono uppercase tracking-[0.25em] text-stone-400 mt-3">
              {activeRoom ? `${activeRoom.name} — ${activeRoom.finish}` : 'Hover rooms for finishes'}
            </div>
          </div>

          {/* right column: spec + calculator */}
          <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-stone-900/10 flex flex-col">
            {/* quick spec strip */}
            <div className="grid grid-cols-4 divide-x divide-stone-900/8 border-b border-stone-900/10 text-center shrink-0">
              {[
                [floor.areaSqm + '', 'm²'],
                [floor.bedrooms + '', 'bed'],
                [floor.bathrooms + '', 'bath'],
                [floor.orientation, 'aspect'],
              ].map(([v, l]) => (
                <div key={l} className="py-3 px-1">
                  <div className="text-sm font-mono font-bold text-stone-900 truncate">{v}</div>
                  <div className="text-[9px] font-mono uppercase text-stone-400">{l}</div>
                </div>
              ))}
            </div>

            {/* mortgage calculator */}
            <div className="p-5 flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-stone-500">
                  Monthly estimate · 3.6%
                </span>
                <span className="text-xl font-mono font-bold text-[#E65100] tabular-nums">{fmtEUR(monthly)}/mo</span>
              </div>

              <label className="block mb-3">
                <div className="flex justify-between text-[10px] font-mono uppercase text-stone-500 mb-1">
                  <span>Down payment</span>
                  <span className="text-stone-900 font-bold">
                    {downPct}% · {fmtEUR((floor.priceEUR * downPct) / 100)}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={5}
                  value={downPct}
                  onChange={(e) => setDownPct(Number(e.target.value))}
                  className="vs-range w-full"
                />
              </label>

              <label className="block">
                <div className="flex justify-between text-[10px] font-mono uppercase text-stone-500 mb-1">
                  <span>Term</span>
                  <span className="text-stone-900 font-bold">{years} yrs</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={35}
                  step={5}
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="vs-range w-full"
                />
              </label>
            </div>

            {/* price + CTA */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-stone-900/10 bg-stone-50 shrink-0">
              <div>
                <div className="text-[9px] font-mono uppercase text-stone-400">Price</div>
                <div className="text-2xl font-mono font-bold text-stone-900 leading-none">{floor.price}</div>
              </div>
              <button
                onClick={() => {
                  if (!isSaved) store.toggleSaved(project.id, floor.floorNumber);
                  close();
                  scrollEngine.scrollToSection('contact');
                }}
                className="group flex items-center gap-2 px-5 py-3 bg-[#E65100] hover:bg-[#D84300] text-white text-xs font-bold uppercase tracking-widest transition-all shadow-md"
              >
                Inquire <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
