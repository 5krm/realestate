import React, { useEffect, useRef } from 'react';

/**
 * Drafting-reticle cursor. Fully imperative (transform + class writes),
 * mounts once and never re-renders.
 */
export const CustomCursor: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = rootRef.current;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!root || !ring || !dot) return;

    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let visible = false;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        visible = true;
        root.style.opacity = '1';
      }
      const t = e.target as HTMLElement | null;
      const interactive = !!t?.closest('button, a, input, select, textarea, [data-interactive="true"]');
      ring.className =
        'absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150 ease-out flex items-center justify-center ' +
        (interactive
          ? 'w-10 h-10 border border-[#E65100] bg-[#E65100]/10 rotate-45'
          : 'w-6 h-6 border border-stone-500/50');
      dot.className =
        'absolute -translate-x-1/2 -translate-y-1/2 w-1 h-1 transition-colors ' +
        (interactive ? 'bg-[#E65100]' : 'bg-stone-700');
    };
    const onDown = () => (ring.style.transform = 'translate(-50%,-50%) scale(0.7)');
    const onUp = () => (ring.style.transform = 'translate(-50%,-50%) scale(1)');
    const onLeave = () => {
      visible = false;
      root.style.opacity = '0';
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      rx += (x - rx) * 0.22;
      ry += (y - ry) * 0.22;
      root.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.documentElement.addEventListener('mouseleave', onLeave);
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div ref={rootRef} className="fixed top-0 left-0 z-[60] pointer-events-none opacity-0 hidden md:block" style={{ willChange: 'transform' }}>
      <div ref={dotRef} className="absolute -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-stone-700" />
      <div ref={ringRef} className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-stone-500/50 transition-all duration-150 ease-out" />
    </div>
  );
};
