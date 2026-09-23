import React from 'react';
import { NEIGHBORHOOD_PINS } from '../data/residences';
import { NeighborhoodPin } from '../types';
import { Train, Trees, Waves, Coffee } from 'lucide-react';

interface NeighborhoodOverlayProps {
  scrollProgress: number;
  activePinId: string | null;
  onSelectPin: (pinId: string) => void;
  onScheduleVisit: () => void;
}

export const NeighborhoodOverlay: React.FC<NeighborhoodOverlayProps> = ({
  scrollProgress,
  activePinId,
  onSelectPin,
  onScheduleVisit,
}) => {
  if (scrollProgress < 0.66 || scrollProgress > 0.84) return null;

  const currentPin: NeighborhoodPin =
    NEIGHBORHOOD_PINS.find((p) => p.id === activePinId) || NEIGHBORHOOD_PINS[0];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'transit':
        return <Train className="w-4 h-4 text-[#E65100]" />;
      case 'nature':
        return <Trees className="w-4 h-4 text-emerald-600" />;
      case 'water':
        return <Waves className="w-4 h-4 text-sky-600" />;
      case 'culinary':
        return <Coffee className="w-4 h-4 text-amber-700" />;
      default:
        return <Train className="w-4 h-4 text-[#E65100]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-12 overflow-hidden">
      {/* Top Section Header */}
      <div className="mt-16 pointer-events-auto max-w-lg">
        <div className="text-xs font-mono text-[#E65100] tracking-widest uppercase mb-1 font-semibold">
          DISTRICT ECOSYSTEM
        </div>
        <h2 className="text-2xl md:text-3xl font-serif text-stone-900">
          The Waterfront Sanctuary
        </h2>
      </div>

      {/* Floating Amenity Chips & Summary */}
      <div className="max-w-md bg-white/90 backdrop-blur-md border border-stone-200/90 p-5 shadow-xl pointer-events-auto mb-6">
        <div className="grid grid-cols-2 gap-2 mb-4">
          {NEIGHBORHOOD_PINS.map((pin) => {
            const isActive = pin.id === currentPin.id;
            return (
              <button
                key={pin.id}
                onClick={() => onSelectPin(pin.id)}
                className={`flex items-center gap-2 p-2.5 border text-left transition-all ${
                  isActive
                    ? 'bg-stone-50 border-[#E65100] shadow-sm'
                    : 'bg-white border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="p-1.5 bg-stone-100 rounded-sm">
                  {getCategoryIcon(pin.category)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-stone-900 truncate">{pin.name}</div>
                  <div className="text-[10px] font-mono text-stone-500">{pin.walkTime}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Amenity Info */}
        <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-stone-900">{currentPin.name}</div>
            <div className="text-stone-500 text-[11px]">{currentPin.description}</div>
          </div>
          <button
            onClick={onScheduleVisit}
            className="shrink-0 ml-3 px-3 py-1.5 bg-[#E65100] text-white font-medium hover:bg-[#D84300] transition-colors"
          >
            Visit
          </button>
        </div>
      </div>
    </div>
  );
};
