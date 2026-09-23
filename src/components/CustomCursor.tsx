import React, { useEffect, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const onMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (
        target?.closest('button') ||
        target?.closest('a') ||
        target?.closest('input') ||
        target?.closest('select') ||
        target?.closest('textarea') ||
        target?.closest('[data-interactive="true"]')
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);
    const onMouseLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none z-50 transition-transform duration-75 ease-out hidden md:block"
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        left: 0,
        top: 0,
      }}
    >
      {/* Central drafting dot */}
      <div
        className={`w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full transition-colors duration-150 ${
          isHovered ? 'bg-[#E65100] scale-150' : 'bg-stone-800'
        }`}
      />

      {/* Crosshair drafting reticle */}
      <div
        className={`absolute -translate-x-1/2 -translate-y-1/2 border transition-all duration-200 ease-out flex items-center justify-center ${
          isHovered
            ? 'w-10 h-10 border-[#E65100] bg-[#E65100]/10 rotate-45'
            : isClicking
            ? 'w-4 h-4 border-stone-800 scale-90'
            : 'w-6 h-6 border-stone-500/40'
        }`}
      >
        <span className="absolute -top-1 -left-1 w-1 h-1 border-t border-l border-stone-600" />
        <span className="absolute -top-1 -right-1 w-1 h-1 border-t border-r border-stone-600" />
        <span className="absolute -bottom-1 -left-1 w-1 h-1 border-b border-l border-stone-600" />
        <span className="absolute -bottom-1 -right-1 w-1 h-1 border-b border-r border-stone-600" />
      </div>
    </div>
  );
};
