import React, { useState } from 'react';
import { Sun, Sunset, Moon, Sparkles, DraftingCompass, Heart, Volume2, VolumeX } from 'lucide-react';
import { scrollEngine, SECTIONS } from '../lib/scrollEngine';
import { store, useUI } from '../state/store';
import { soundscape } from '../utils/audio';
import type { TimePreference } from '../types';

const TIME_OPTIONS: { id: TimePreference; icon: React.ReactNode; title: string }[] = [
  { id: 'auto', icon: <Sparkles className="w-3.5 h-3.5" />, title: 'Auto (follows story)' },
  { id: 'day', icon: <Sun className="w-3.5 h-3.5" />, title: 'Day' },
  { id: 'golden', icon: <Sunset className="w-3.5 h-3.5" />, title: 'Golden hour' },
  { id: 'night', icon: <Moon className="w-3.5 h-3.5" />, title: 'Night' },
];

export const Header: React.FC = () => {
  const section = useUI((s) => s.section);
  const timePreference = useUI((s) => s.timePreference);
  const blueprint = useUI((s) => s.blueprint);
  const saved = useUI((s) => s.savedHomes);
  const [audioOn, setAudioOn] = useState(false);

  return (
    <header className="site-header fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-3 px-4 md:px-6 py-3 bg-white/75 backdrop-blur-md border-b border-stone-900/8 transition-colors">
      {/* wordmark */}
      <button
        onClick={() => scrollEngine.scrollToSection('hero')}
        className="flex items-baseline gap-2 group shrink-0"
      >
        <span className="text-base md:text-lg font-serif font-semibold tracking-tight group-hover:text-[#E65100] transition-colors">
          Vanguard<span className="text-[#E65100]">&amp;</span>Stone
        </span>
        <span className="hidden lg:inline text-[9px] font-mono uppercase tracking-[0.2em] text-stone-400">
          River District
        </span>
      </button>

      {/* section pills */}
      <nav className="hidden md:flex items-center gap-0.5 p-0.5 rounded-full bg-stone-900/5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => scrollEngine.scrollToSection(s.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all ${
              section === s.id
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* time-of-day segmented control */}
        <div className="flex items-center p-0.5 rounded-full bg-stone-900/5" title="Time of day">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t.id}
              title={t.title}
              onClick={() => store.set({ timePreference: t.id })}
              className={`p-1.5 rounded-full transition-all ${
                timePreference === t.id ? 'bg-[#E65100] text-white shadow-sm' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* blueprint toggle */}
        <button
          title="Blueprint X-Ray (B)"
          onClick={() => store.set({ blueprint: !blueprint })}
          className={`p-2 rounded-full transition-all ${
            blueprint ? 'bg-[#0b3aa8] text-white shadow-sm' : 'bg-stone-900/5 text-stone-500 hover:text-stone-900'
          }`}
        >
          <DraftingCompass className="w-3.5 h-3.5" />
        </button>

        {/* saved homes */}
        <button
          title={`${saved.length} saved home${saved.length === 1 ? '' : 's'}`}
          onClick={() => scrollEngine.scrollToSection('contact')}
          className="relative p-2 rounded-full bg-stone-900/5 text-stone-500 hover:text-stone-900 transition-colors"
        >
          <Heart className={`w-3.5 h-3.5 ${saved.length ? 'fill-[#E65100] text-[#E65100]' : ''}`} />
          {saved.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-[#E65100] text-white text-[8px] font-mono font-bold flex items-center justify-center">
              {saved.length}
            </span>
          )}
        </button>

        {/* ambience */}
        <button
          title="Ambience"
          onClick={() => setAudioOn(soundscape.toggle())}
          className="hidden sm:block p-2 rounded-full bg-stone-900/5 text-stone-500 hover:text-stone-900 transition-colors"
        >
          {audioOn ? <Volume2 className="w-3.5 h-3.5 text-[#E65100]" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => scrollEngine.scrollToSection('contact')}
          className="ml-1 px-4 py-2 rounded-full bg-[#E65100] hover:bg-[#D84300] text-white text-[11px] font-bold uppercase tracking-wider shadow-sm transition-colors"
        >
          Inquire
        </button>
      </div>
    </header>
  );
};
