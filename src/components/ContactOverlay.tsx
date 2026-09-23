import React, { useState } from 'react';
import { ArrowRight, Check, Heart, MapPin } from 'lucide-react';
import { store, useUI } from '../state/store';
import { PROJECT_BY_ID } from '../data/residences';

export const ContactOverlay: React.FC = () => {
  const saved = useUI((s) => s.savedHomes);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 550);
  };

  const savedSummary = saved
    .map((key) => {
      const [pid, fn] = key.split(':');
      const proj = PROJECT_BY_ID[pid];
      const floor = proj?.floors.find((f) => f.floorNumber === Number(fn));
      return floor ? `${proj.name} · ${floor.name} (${floor.price})` : null;
    })
    .filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center p-4 md:p-10">
      <div className="pointer-events-auto grid grid-cols-1 lg:grid-cols-12 gap-4 w-full max-w-4xl">
        {/* form */}
        <div className="lg:col-span-7 bg-white/88 backdrop-blur-md border border-stone-900/10 shadow-2xl p-6 md:p-8">
          <div className="text-[10px] font-mono font-bold tracking-[0.3em] text-[#E65100] uppercase mb-1">
            Private inquiry
          </div>
          <h2 className="text-3xl md:text-4xl font-serif text-stone-900 tracking-tight mb-5">
            The keys are waiting<span className="text-[#E65100]">.</span>
          </h2>

          {sent ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="text-sm font-semibold text-stone-900">Received — an advisor replies within 24h.</div>
              <button
                onClick={() => {
                  setSent(false);
                  setName('');
                  setEmail('');
                }}
                className="text-[11px] font-mono uppercase tracking-widest text-stone-500 hover:text-stone-900 underline underline-offset-4"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Full name"
                className="w-full px-4 py-3 text-sm bg-white/70 border border-stone-900/15 focus:border-[#E65100] focus:outline-none transition-colors"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 text-sm bg-white/70 border border-stone-900/15 focus:border-[#E65100] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={sending}
                className="group w-full flex items-center justify-center gap-2 py-3.5 bg-[#E65100] hover:bg-[#D84300] text-white text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-lg shadow-orange-900/20"
              >
                {sending ? 'Sending…' : 'Request private gallery'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          )}
        </div>

        {/* side rail: saved homes + gallery info */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-stone-900/85 backdrop-blur-md text-white shadow-2xl p-5">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-orange-400 font-bold mb-2.5">
              <Heart className="w-3 h-3 fill-orange-400" /> Your shortlist
            </div>
            {savedSummary.length ? (
              <ul className="space-y-1.5">
                {savedSummary.map((line) => (
                  <li key={line} className="text-xs text-stone-200 flex items-start gap-2">
                    <span className="text-[#ff8a3d] mt-0.5">▸</span>
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400">
                No saved homes yet — tap the <Heart className="w-3 h-3 inline" /> on any residence.
              </p>
            )}
          </div>

          <div className="bg-white/88 backdrop-blur-md border border-stone-900/10 shadow-2xl p-5 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-stone-500 font-bold mb-2.5">
              <MapPin className="w-3 h-3 text-[#E65100]" /> Sales gallery
            </div>
            <div className="text-sm font-serif text-stone-900">14 Quai de Saint-Jude</div>
            <div className="text-[11px] font-mono text-stone-500 mt-1">
              By appointment · concierge@vanguardstone.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
