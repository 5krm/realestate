import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundscape } from '../utils/audio';

interface HeaderProps {
  onNavigate: (sectionId: string) => void;
  activeSection: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, activeSection }) => {
  const [isAudioActive, setIsAudioActive] = useState(false);

  const toggleAudio = () => {
    const active = soundscape.toggle();
    setIsAudioActive(active);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-stone-200/70 transition-colors">
      {/* Wordmark */}
      <button
        onClick={() => onNavigate('hero')}
        className="text-lg md:text-xl font-serif font-semibold tracking-tight text-stone-900 hover:text-[#E65100] transition-colors text-left"
      >
        Vanguard & Stone
      </button>

      {/* Clean text navigation */}
      <nav className="hidden md:flex items-center gap-8 text-xs tracking-wider uppercase font-medium text-stone-600">
        <button
          onClick={() => onNavigate('hero')}
          className={`transition-colors hover:text-stone-900 py-1 ${
            activeSection === 'hero' ? 'text-[#E65100] font-bold border-b-2 border-[#E65100]' : ''
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => onNavigate('timeline')}
          className={`transition-colors hover:text-stone-900 py-1 ${
            activeSection === 'timeline' ? 'text-[#E65100] font-bold border-b-2 border-[#E65100]' : ''
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => onNavigate('residences')}
          className={`transition-colors hover:text-stone-900 py-1 ${
            activeSection === 'residences' ? 'text-[#E65100] font-bold border-b-2 border-[#E65100]' : ''
          }`}
        >
          Towers
        </button>
        <button
          onClick={() => onNavigate('neighborhood')}
          className={`transition-colors hover:text-stone-900 py-1 ${
            activeSection === 'neighborhood' ? 'text-[#E65100] font-bold border-b-2 border-[#E65100]' : ''
          }`}
        >
          District
        </button>
        <button
          onClick={() => onNavigate('track-record')}
          className={`transition-colors hover:text-stone-900 py-1 ${
            activeSection === 'track-record' ? 'text-[#E65100] font-bold border-b-2 border-[#E65100]' : ''
          }`}
        >
          Portfolio
        </button>
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleAudio}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors"
          title={isAudioActive ? 'Mute Ambience' : 'Play Ambience'}
        >
          {isAudioActive ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#E65100]" />
              <span className="hidden sm:inline font-semibold">Sound: ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline">Sound: OFF</span>
            </>
          )}
        </button>

        <button
          onClick={() => onNavigate('contact')}
          className="px-4 py-2 text-xs font-semibold tracking-wide uppercase bg-[#E65100] hover:bg-[#D84300] text-white shadow-sm transition-all"
        >
          Inquire
        </button>
      </div>
    </header>
  );
};
