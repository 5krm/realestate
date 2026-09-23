import React, { useEffect, useState } from 'react';
import { scrollEngine } from './lib/scrollEngine';
import { store, useUI } from './state/store';
import { soundscape } from './utils/audio';
import { ThreeScene } from './components/ThreeScene';
import { CustomCursor } from './components/CustomCursor';
import { Preloader } from './components/Preloader';
import { Header } from './components/Header';
import { ElevationGauge } from './components/ElevationGauge';
import { HeroOverlay } from './components/HeroOverlay';
import { BuildOverlay } from './components/BuildOverlay';
import { ResidencesOverlay } from './components/ResidencesOverlay';
import { DistrictOverlay } from './components/DistrictOverlay';
import { RecordOverlay } from './components/RecordOverlay';
import { ContactOverlay } from './components/ContactOverlay';
import { FloorPlanModal } from './components/FloorPlanModal';
import { StatusBar } from './components/StatusBar';

export default function App() {
  const [preloaderDone, setPreloaderDone] = useState(false);
  const modalFloor = useUI((s) => s.modalFloor);
  const section = useUI((s) => s.section);

  useEffect(() => {
    scrollEngine.init();
    const unsub = scrollEngine.onSectionChange((sec) => store.set({ section: sec }));

    // feed the ambient soundscape (no React state involved)
    const unsubFrame = scrollEngine.onFrame((p) => soundscape.updateScroll(p));

    // keyboard section jumping
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const order = ['hero', 'build', 'residences', 'district', 'record', 'contact'] as const;
      const idx = order.indexOf(scrollEngine.section);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        scrollEngine.scrollToSection(order[Math.min(order.length - 1, idx + 1)]);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        scrollEngine.scrollToSection(order[Math.max(0, idx - 1)]);
      } else if (e.key === 'b' || e.key === 'B') {
        store.set({ blueprint: !store.get().blueprint });
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      unsub();
      unsubFrame();
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#eef1f2] text-stone-900 selection:bg-[#E65100] selection:text-white">
      <CustomCursor />
      {!preloaderDone && <Preloader onComplete={() => setPreloaderDone(true)} />}

      <Header />
      <ElevationGauge />

      {/* persistent 3D world */}
      <ThreeScene />

      {/* section overlays — each mounts only in its own section */}
      {section === 'hero' && <HeroOverlay />}
      {section === 'build' && <BuildOverlay />}
      {section === 'residences' && <ResidencesOverlay />}
      {section === 'district' && <DistrictOverlay />}
      {section === 'record' && <RecordOverlay />}
      {section === 'contact' && <ContactOverlay />}

      {modalFloor && <FloorPlanModal />}
      <StatusBar />

      {/* 600vh scroll track */}
      <div className="relative z-10 pointer-events-none">
        <div className="h-[600vh] w-full" />
      </div>
    </div>
  );
}
