import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import { ThreeScene } from './components/ThreeScene';
import { CustomCursor } from './components/CustomCursor';
import { Preloader } from './components/Preloader';
import { Header } from './components/Header';
import { CraneRuler } from './components/CraneRuler';
import { HeroOverlay } from './components/HeroOverlay';
import { BuildSequenceCaptions } from './components/BuildSequenceCaptions';
import { ResidencesOverlay } from './components/ResidencesOverlay';
import { NeighborhoodOverlay } from './components/NeighborhoodOverlay';
import { TrackRecordSection } from './components/TrackRecordSection';
import { ContactSection } from './components/ContactSection';
import { BUILD_PHASES } from './data/residences';

export default function App() {
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');
  const [activeProjectId, setActiveProjectId] = useState('obsidian-tower');
  const [isExplodedView, setIsExplodedView] = useState(true);
  const [hoveredFloorIndex, setHoveredFloorIndex] = useState<number | null>(null);
  const [activePinId, setActivePinId] = useState<string | null>('metro');

  const lenisRef = useRef<Lenis | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    const onScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const currentProgress = Math.min(Math.max(window.scrollY / scrollHeight, 0), 1);
        setScrollProgress(currentProgress);

        // Determine active navigation section
        if (currentProgress < 0.12) {
          setActiveSection('hero');
        } else if (currentProgress >= 0.12 && currentProgress < 0.52) {
          setActiveSection('timeline');
        } else if (currentProgress >= 0.52 && currentProgress < 0.68) {
          setActiveSection('residences');
        } else if (currentProgress >= 0.68 && currentProgress < 0.84) {
          setActiveSection('neighborhood');
        } else if (currentProgress >= 0.84 && currentProgress < 0.93) {
          setActiveSection('track-record');
        } else {
          setActiveSection('contact');
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    lenis.on('scroll', onScroll);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      lenis.destroy();
    };
  }, []);

  const jumpToProgress = useCallback((targetProgress: number) => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const targetY = targetProgress * scrollHeight;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(targetY, { duration: 1.4 });
    } else {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  }, []);

  const navigateToSection = (sectionId: string) => {
    switch (sectionId) {
      case 'hero':
        jumpToProgress(0.0);
        break;
      case 'timeline':
        jumpToProgress(0.24);
        break;
      case 'residences':
        jumpToProgress(0.58);
        break;
      case 'neighborhood':
        jumpToProgress(0.74);
        break;
      case 'track-record':
        jumpToProgress(0.87);
        break;
      case 'contact':
        jumpToProgress(0.98);
        break;
      default:
        jumpToProgress(0.0);
    }
  };

  const handleSelectPhase = (phaseIdx: number) => {
    const phase = BUILD_PHASES[phaseIdx];
    if (phase) {
      const midProgress = (phase.scrollRange[0] + phase.scrollRange[1]) / 2;
      jumpToProgress(midProgress);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#dce8f4] text-stone-900 selection:bg-[#E65100] selection:text-white">
      {/* Custom Crosshair Cursor */}
      <CustomCursor />

      {/* Preloader */}
      {!preloaderDone && <Preloader onComplete={() => setPreloaderDone(true)} />}

      {/* Top 3-Zone Header */}
      <Header onNavigate={navigateToSection} activeSection={activeSection} />

      {/* Crane-Height Elevation Ruler */}
      <CraneRuler scrollProgress={scrollProgress} onJumpToProgress={jumpToProgress} />

      {/* Persistent 3D Three.js Canvas Scene */}
      <ThreeScene
        scrollProgress={scrollProgress}
        activeProjectId={activeProjectId}
        hoveredFloorIndex={hoveredFloorIndex}
        activePinId={activePinId}
        isExplodedView={isExplodedView}
        onBuildingSelect={(id) => {
          setActiveProjectId(id);
          if (scrollProgress < 0.52 || scrollProgress > 0.68) {
            jumpToProgress(0.58);
          }
        }}
        onFloorHover={setHoveredFloorIndex}
        onPinClick={(pinId) => setActivePinId(pinId)}
      />

      {/* Hero Overlay (0% to 12%) */}
      <HeroOverlay
        opacity={Math.max(1 - scrollProgress * 7, 0)}
        onExploreResidences={() => jumpToProgress(0.58)}
        onWatchItRise={() => jumpToProgress(0.22)}
      />

      {/* Signature Build Sequence Captions Overlay (12% to 52%) */}
      <BuildSequenceCaptions
        scrollProgress={scrollProgress}
        onSelectPhase={handleSelectPhase}
      />

      {/* Residences & Exploded Tower Overlay (52% to 68%) */}
      <ResidencesOverlay
        scrollProgress={scrollProgress}
        activeProjectId={activeProjectId}
        isExplodedView={isExplodedView}
        hoveredFloorIndex={hoveredFloorIndex}
        onSelectProject={setActiveProjectId}
        onToggleExploded={setIsExplodedView}
        onHoverFloor={setHoveredFloorIndex}
        onScheduleTour={() => jumpToProgress(0.98)}
      />

      {/* Neighborhood District HUD Overlay (68% to 84%) */}
      <NeighborhoodOverlay
        scrollProgress={scrollProgress}
        activePinId={activePinId}
        onSelectPin={setActivePinId}
        onScheduleVisit={() => jumpToProgress(0.98)}
      />

      {/* Scroll track driving the pinned 3D cinematic time-lapse (~500vh) */}
      <div ref={scrollContainerRef} className="relative z-10 pointer-events-none">
        {/* Pinned 3D Sequence spacer (~420vh) */}
        <div className="h-[420vh] w-full" />

        {/* 2D Breathing Space: Track Record Section */}
        <div className="pointer-events-auto">
          <TrackRecordSection isVisible={scrollProgress >= 0.80} />
        </div>

        {/* Contact Section: Blue Hour Skyline & Inquiry Form */}
        <div className="pointer-events-auto">
          <ContactSection />
        </div>
      </div>
    </div>
  );
}
