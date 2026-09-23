import React, { useEffect, useRef } from 'react';
import { SceneEngine } from '../three/SceneEngine';
import { scrollEngine } from '../lib/scrollEngine';
import { store } from '../state/store';

/**
 * Thin React shell for the WebGL engine. Zero state, zero re-renders:
 * the engine is driven imperatively by the scroll engine's frame loop.
 */
export const ThreeScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const engine = new SceneEngine(container, {
      onTip: (tip) => {
        const el = tipRef.current;
        if (!el) return;
        if (!tip) {
          el.style.opacity = '0';
          return;
        }
        el.style.opacity = '1';
        el.style.transform = `translate(${Math.round(tip.x + 14)}px, ${Math.round(tip.y - 14)}px)`;
        const label = el.querySelector('[data-tip-label]');
        const sub = el.querySelector('[data-tip-sub]');
        if (label && label.textContent !== tip.label) label.textContent = tip.label;
        if (sub && sub.textContent !== tip.sub) sub.textContent = tip.sub;
      },
      onQualityChange: (q) => store.set({ quality: q }),
      onReady: () => store.set({ sceneReady: true }),
    });
    engineRef.current = engine;

    const unsub = scrollEngine.onFrame((progress, dt, time) => {
      engine.update(progress, dt, time);
    });

    return () => {
      unsub();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'pan-y' }}
        data-interactive="true"
      />
      {/* 3D hover tooltip — imperative, no re-renders */}
      <div
        ref={tipRef}
        className="absolute top-0 left-0 opacity-0 pointer-events-none transition-opacity duration-150 z-10"
        style={{ willChange: 'transform' }}
      >
        <div className="bg-stone-900/92 backdrop-blur-sm text-white px-3 py-1.5 shadow-xl border border-white/10 -translate-y-full">
          <div data-tip-label className="text-xs font-semibold whitespace-nowrap" />
          <div data-tip-sub className="text-[10px] font-mono text-orange-300 whitespace-nowrap" />
        </div>
      </div>
    </div>
  );
};
