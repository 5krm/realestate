import React, { useState } from 'react';
import { Send, CheckCircle2, MapPin, Mail, Phone } from 'lucide-react';

interface ContactSectionProps {
  onScheduleFocus?: () => void;
}

export const ContactSection: React.FC<ContactSectionProps> = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    residence: 'The Spire',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        residence: 'The Spire',
        notes: '',
      });
    }, 600);
  };

  return (
    <section id="contact-section" className="relative w-full bg-[#f4f2ee] text-stone-900 py-20 px-6 md:px-16 border-t border-stone-200">
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-stone-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#E65100] tracking-widest uppercase mb-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#E65100]" />
              <span>PRIVATE INQUIRY</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif text-stone-900 tracking-tight">
              Begin your residence journey.
            </h2>
          </div>
          <p className="mt-3 md:mt-0 text-xs font-mono text-stone-500">
            Private Gallery: 14 Quai de Saint-Jude · By Appointment
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form */}
          <div className="lg:col-span-7 bg-white border border-stone-200 p-6 md:p-8 shadow-sm">
            {submitted ? (
              <div className="p-6 bg-stone-50 border border-emerald-500 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-lg font-serif text-stone-900 mb-1">Inquiry Received</h3>
                <p className="text-xs text-stone-600">Our private client advisor will reach out within 24 hours.</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-4 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 focus:border-[#E65100] focus:outline-none"
                    placeholder="Eleanor Vance"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 focus:border-[#E65100] focus:outline-none"
                      placeholder="e.vance@residence.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 focus:border-[#E65100] focus:outline-none"
                      placeholder="+33 6 42 00 11 22"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Project of Interest</label>
                  <select
                    value={formData.residence}
                    onChange={(e) => setFormData({ ...formData, residence: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 focus:border-[#E65100] focus:outline-none"
                  >
                    <option value="The Spire">The Spire (Landmark Tower)</option>
                    <option value="The Skybridge Towers">The Skybridge Towers</option>
                    <option value="River Terraces">River Terraces (Waterfront Cascades)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 focus:border-[#E65100] focus:outline-none"
                    placeholder="Specific floor or bedroom requirements..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#E65100] hover:bg-[#D84300] text-white font-medium text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Transmitting...' : 'Submit Inquiry'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Details */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 bg-white border border-stone-200">
            <div>
              <h3 className="text-xl font-serif text-stone-900 mb-3">District Sales Gallery</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-6">
                Experience physical architectural scale models, bespoke finish materiality trays, and private penthouse terrace views.
              </p>

              <div className="space-y-3 text-xs text-stone-700">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#E65100]" />
                  <span>14 Quai de Saint-Jude, Waterfront District</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#E65100]" />
                  <span>concierge@vanguardstone.com</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#E65100]" />
                  <span>+33 (0) 1 48 00 24 00</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-stone-200 text-[11px] font-mono text-stone-400">
              © 2004–2026 Vanguard & Stone Development. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
