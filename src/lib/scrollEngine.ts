import Lenis from 'lenis';
import type { SectionId } from '../types';

export interface SectionDef {
  id: SectionId;
  label: string;
  range: [number, number];
}

export const SECTIONS: SectionDef[] = [
  { id: 'hero', label: 'Overview', range: [0, 0.10] },
  { id: 'build', label: 'The Rise', range: [0.10, 0.46] },
  { id: 'residences', label: 'Residences', range: [0.46, 0.62] },
  { id: 'district', label: 'District', range: [0.62, 0.76] },
  { id: 'record', label: 'Record', range: [0.76, 0.88] },
  { id: 'contact', label: 'Inquire', range: [0.88, 1.0] },
];

export function sectionAt(p: number): SectionDef {
  for (const s of SECTIONS) {
    if (p >= s.range[0] && p < s.range[1]) return s;
  }
  return p < 0.1 ? SECTIONS[0] : SECTIONS[SECTIONS.length - 1];
}

/** Progress 0..1 inside the given section */
export function sectionLocal(p: number, id: SectionId): number {
  const s = SECTIONS.find((x) => x.id === id)!;
  const t = (p - s.range[0]) / (s.range[1] - s.range[0]);
  return Math.min(1, Math.max(0, t));
}

type FrameFn = (progress: number, dt: number, time: number) => void;

/**
 * Central scroll + frame engine.
 * Owns the ONLY requestAnimationFrame loop in the app: drives Lenis,
 * computes scroll progress, and fans it out to imperative subscribers.
 * React components never re-render per frame — state changes only on
 * discrete section boundaries (see store.ts).
 */
class ScrollEngine {
  progress = 0;
  section: SectionId = 'hero';
  private lenis: Lenis | null = null;
  private frameSubs = new Set<FrameFn>();
  private sectionSubs = new Set<(s: SectionId, prev: SectionId) => void>();
  private rafId = 0;
  private lastTime = 0;
  private started = false;

  init() {
    if (this.started) return;
    this.started = true;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduceMotion) {
      this.lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.95,
        touchMultiplier: 1.4,
      });
    }

    this.lastTime = performance.now();
    const loop = (time: number) => {
      this.rafId = requestAnimationFrame(loop);
      if (document.hidden) {
        this.lastTime = time;
        return;
      }
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;

      this.lenis?.raf(time);

      const max = document.documentElement.scrollHeight - window.innerHeight;
      this.progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

      const sec = sectionAt(this.progress).id;
      if (sec !== this.section) {
        const prev = this.section;
        this.section = sec;
        this.sectionSubs.forEach((fn) => fn(sec, prev));
      }

      this.frameSubs.forEach((fn) => fn(this.progress, dt, time / 1000));
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /** Subscribe to per-frame updates. Returns unsubscribe. */
  onFrame(fn: FrameFn): () => void {
    this.frameSubs.add(fn);
    return () => this.frameSubs.delete(fn);
  }

  onSectionChange(fn: (s: SectionId, prev: SectionId) => void): () => void {
    this.sectionSubs.add(fn);
    return () => this.sectionSubs.delete(fn);
  }

  scrollTo(target: number, immediate = false) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = target * max;
    if (this.lenis) {
      this.lenis.scrollTo(y, { duration: immediate ? 0 : 1.5, easing: (t) => 1 - Math.pow(1 - t, 3) });
    } else {
      window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
    }
  }

  scrollToSection(id: SectionId) {
    const s = SECTIONS.find((x) => x.id === id);
    if (!s) return;
    const mid = (s.range[0] + s.range[1]) / 2;
    this.scrollTo(id === 'hero' ? 0 : id === 'contact' ? 0.995 : mid);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    this.lenis?.destroy();
    this.started = false;
  }
}

export const scrollEngine = new ScrollEngine();
