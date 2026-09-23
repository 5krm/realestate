import React, { useState } from 'react';
import { RESIDENCE_PROJECTS } from '../data/residences';
import { ResidenceProject, ResidenceFloor } from '../types';
import { FloorPlanModal } from './FloorPlanModal';
import { Layers, ArrowRight, Eye } from 'lucide-react';

interface ResidencesOverlayProps {
  scrollProgress: number;
  activeProjectId: string;
  isExplodedView: boolean;
  hoveredFloorIndex: number | null;
  onSelectProject: (projectId: string) => void;
  onToggleExploded: (exploded: boolean) => void;
  onHoverFloor: (floorIdx: number | null) => void;
  onScheduleTour: () => void;
}

export const ResidencesOverlay: React.FC<ResidencesOverlayProps> = ({
  scrollProgress,
  activeProjectId,
  isExplodedView,
  hoveredFloorIndex,
  onSelectProject,
  onToggleExploded,
  onHoverFloor,
  onScheduleTour,
}) => {
  const [selectedFloorForPlan, setSelectedFloorForPlan] = useState<ResidenceFloor | null>(null);

  if (scrollProgress < 0.52 || scrollProgress > 0.70) return null;

  const activeProject: ResidenceProject =
    RESIDENCE_PROJECTS.find((p) => p.id === activeProjectId) || RESIDENCE_PROJECTS[0];

  const activeFloor =
    hoveredFloorIndex !== null && activeProject.floors[hoveredFloorIndex]
      ? activeProject.floors[hoveredFloorIndex]
      : activeProject.floors[0];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-12 overflow-hidden">
      {/* Top Project Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-16 pointer-events-auto">
        <div className="flex items-center gap-1.5 p-1 bg-white/85 backdrop-blur-md border border-stone-200 shadow-sm">
          {RESIDENCE_PROJECTS.map((proj) => {
            const isCurrent = proj.id === activeProjectId;
            return (
              <button
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className={`px-3 sm:px-4 py-2 text-xs font-medium tracking-wide transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-[#E65100] text-white font-semibold shadow-sm'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {proj.name}
              </button>
            );
          })}
        </div>

        {/* Exploded View Toggle */}
        <button
          onClick={() => onToggleExploded(!isExplodedView)}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono tracking-wider uppercase border transition-all shadow-sm ${
            isExplodedView
              ? 'bg-stone-900 text-white border-stone-900 font-bold'
              : 'bg-white/90 text-stone-800 border-stone-200 hover:bg-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#E65100]" />
          <span>{isExplodedView ? 'Floor Slabs: Exploded' : 'Explode Slabs'}</span>
        </button>
      </div>

      {/* Floating Project Summary Card */}
      <div className="max-w-xl bg-white/90 backdrop-blur-md border border-stone-200/90 p-5 md:p-6 shadow-xl pointer-events-auto mb-6">
        <div className="flex items-center justify-between text-xs font-mono text-stone-500 mb-2">
          <span className="text-[#E65100] font-bold uppercase">{activeProject.type}</span>
          <span>{activeProject.availability} · From {activeProject.startingPrice}</span>
        </div>

        <h2 className="text-2xl font-serif text-stone-900 mb-1">
          {activeProject.name}
        </h2>
        <p className="text-xs text-stone-600 mb-4 line-clamp-2">
          {activeProject.description}
        </p>

        {/* Floor Highlight & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200">
          <div className="text-xs font-mono text-stone-700">
            <span className="font-semibold text-stone-900">{activeFloor.name}</span>
            <span className="text-stone-400 mx-2">·</span>
            <span>{activeFloor.areaSqm} m² ({activeFloor.bedrooms} Bed)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedFloorForPlan(activeFloor)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-[#E65100]" />
              <span>Floor Plan</span>
            </button>
            <button
              onClick={onScheduleTour}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E65100] hover:bg-[#D84300] transition-colors shadow-sm"
            >
              <span>Inquire</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floor Plan Modal Viewer */}
      {selectedFloorForPlan && (
        <FloorPlanModal
          floor={selectedFloorForPlan}
          projectName={activeProject.name}
          onClose={() => setSelectedFloorForPlan(null)}
          onInquire={() => {
            setSelectedFloorForPlan(null);
            onScheduleTour();
          }}
        />
      )}
    </div>
  );
};
