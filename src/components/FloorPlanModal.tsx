import React, { useState } from 'react';
import { X, Layers, Check } from 'lucide-react';
import { ResidenceFloor, FloorPlanRoom } from '../types';

interface FloorPlanModalProps {
  floor: ResidenceFloor;
  projectName: string;
  onClose: () => void;
  onInquire?: () => void;
}

export const FloorPlanModal: React.FC<FloorPlanModalProps> = ({
  floor,
  projectName,
  onClose,
  onInquire,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(floor.rooms[0]?.id || 'living');
  const [liftApart, setLiftApart] = useState(true);

  const selectedRoom = floor.rooms.find((r) => r.id === selectedRoomId) || floor.rooms[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-stone-900/60 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-white border border-stone-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div>
            <div className="text-xs font-mono text-[#E65100] font-semibold">
              LEVEL {floor.floorNumber} · {projectName}
            </div>
            <h3 className="text-xl font-serif text-stone-900 mt-0.5">
              {floor.name}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLiftApart(!liftApart)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border transition-all ${
                liftApart
                  ? 'bg-stone-900 text-white border-stone-900 font-bold'
                  : 'bg-white text-stone-700 border-stone-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#E65100]" />
              <span>{liftApart ? 'Lifted Rooms: ON' : 'Lifted: OFF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
          {/* Left: Isometric Visualizer */}
          <div className="lg:col-span-7 p-6 flex flex-col items-center justify-center bg-stone-100 relative min-h-[340px]">
            <div
              className="relative w-[280px] sm:w-[320px] h-[220px]"
              style={{
                perspective: '800px',
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                className="w-full h-full relative transition-transform duration-500"
                style={{
                  transform: 'rotateX(55deg) rotateZ(-30deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Floor plate slab */}
                <div className="absolute inset-0 bg-stone-300 border-2 border-stone-400 shadow-md" />

                {/* Rooms */}
                {floor.rooms.map((room) => {
                  const isSelected = room.id === selectedRoom.id;
                  const [rx, ry, rz] = room.position;
                  const [rw, rh, rd] = room.size;

                  const liftZ = liftApart ? (isSelected ? 40 : 15) : 0;

                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className="absolute border cursor-pointer transition-all duration-300 flex items-center justify-center p-2 text-center"
                      style={{
                        left: `${(rx + 4) * 32}px`,
                        top: `${(rz + 3) * 28}px`,
                        width: `${rw * 32}px`,
                        height: `${rd * 28}px`,
                        backgroundColor: isSelected ? '#E65100' : '#EDE8E1',
                        color: isSelected ? '#ffffff' : '#292524',
                        borderColor: isSelected ? '#C2410C' : '#D6D3CD',
                        transform: `translateZ(${liftZ}px)`,
                        boxShadow: isSelected
                          ? '0 12px 24px rgba(230, 81, 0, 0.35)'
                          : '0 4px 10px rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <span className="text-[10px] font-mono font-bold leading-tight">
                        {room.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-[10px] font-mono text-stone-500 mt-4">
              CLICK ANY ROOM TO INSPECT FINISHES &amp; DIMENSIONS
            </div>
          </div>

          {/* Right: Room Specs & Inquire */}
          <div className="lg:col-span-5 p-6 bg-white border-l border-stone-200 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono text-[#E65100] uppercase font-bold mb-1">
                SELECTED SPACE
              </div>
              <h4 className="text-xl font-serif text-stone-900 mb-1">
                {selectedRoom.name}
              </h4>
              <div className="text-xs font-mono text-stone-500 mb-4">
                {selectedRoom.dimensions} · {selectedRoom.areaSqm} m²
              </div>

              <div className="mb-4 p-3 bg-stone-50 border border-stone-200 text-xs">
                <div className="text-[10px] font-mono text-stone-500 uppercase mb-1">Material Finish</div>
                <div className="font-medium text-stone-800">{selectedRoom.finish}</div>
              </div>

              <div>
                <div className="text-[10px] font-mono text-stone-500 uppercase mb-2">Key Features</div>
                <ul className="space-y-1.5 text-xs text-stone-600">
                  {floor.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#E65100] shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex items-center justify-between mt-6">
              <div>
                <div className="text-[10px] font-mono text-stone-500 uppercase">Valuation</div>
                <div className="text-lg font-mono font-bold text-stone-900">{floor.price}</div>
              </div>
              <button
                onClick={() => {
                  if (onInquire) onInquire();
                  else onClose();
                }}
                className="px-4 py-2 bg-[#E65100] hover:bg-[#D84300] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm"
              >
                Inquire
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
