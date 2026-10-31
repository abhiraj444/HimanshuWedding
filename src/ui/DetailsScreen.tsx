/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Project, EventItem } from '../data/schema.ts';
import { Plus, Trash2, ArrowUp, ArrowDown, Calendar, Clock, MapPin, Sparkles } from 'lucide-react';

interface DetailsScreenProps {
  project: Project;
  onChange: (updated: Project) => void;
}

export const DetailsScreen: React.FC<DetailsScreenProps> = ({ project, onChange }) => {
  const updateCouple = (field: keyof Project['couple'], val: string) => {
    onChange({
      ...project,
      couple: { ...project.couple, [field]: val },
    });
  };

  const updateGroomFamilyLine = (idx: number, val: string) => {
    const lines = [...project.families.groom.lines];
    lines[idx] = val;
    onChange({
      ...project,
      families: {
        ...project.families,
        groom: { ...project.families.groom, lines },
      },
    });
  };

  const updateBrideFamilyLine = (idx: number, val: string) => {
    const lines = [...project.families.bride.lines];
    lines[idx] = val;
    onChange({
      ...project,
      families: {
        ...project.families,
        bride: { ...project.families.bride, lines },
      },
    });
  };

  const updateCopy = (field: keyof Project['copy'], val: string) => {
    onChange({
      ...project,
      copy: { ...project.copy, [field]: val },
    });
  };

  const updateEvent = (idx: number, updated: Partial<EventItem>) => {
    const events = [...project.events];
    events[idx] = { ...events[idx], ...updated };
    onChange({ ...project, events });
  };

  const addEvent = () => {
    const newEv: EventItem = {
      id: `ev_${Date.now()}`,
      date: '2026-12-12',
      day: 'शनिवार',
      title: 'नई रस्म / कार्यक्रम',
      time: '18:00',
      venue: 'शुभ विवाह स्थल',
      icon: 'custom',
      highlight: true,
    };
    onChange({ ...project, events: [...project.events, newEv] });
  };

  const removeEvent = (idx: number) => {
    const events = project.events.filter((_, i) => i !== idx);
    onChange({ ...project, events });
  };

  const moveEvent = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= project.events.length) return;
    const events = [...project.events];
    const temp = events[idx];
    events[idx] = events[newIdx];
    events[newIdx] = temp;
    onChange({ ...project, events });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Intro Header */}
      <div className="border-b border-[#c9a24b]/30 pb-4">
        <h2 className="text-2xl font-bold font-serif text-[#e8d08a] flex items-center gap-2">
          <span>वैवाहिक विवरण एवं संदेश</span>
          <span className="text-xs text-[#c9a24b] font-normal tracking-wide px-2 py-0.5 rounded border border-[#c9a24b]/40">
            Card Details
          </span>
        </h2>
        <p className="text-sm text-[#fbf3dc]/70 mt-1">
          कार्ड पर मुद्रित सभी हिंदी विवरण यहाँ संपादित करें। यह वीडियो में प्रत्यक्ष रूप से दिखाई देगा।
        </p>
      </div>

      {/* Couple Section */}
      <section className="bg-[#240e17] border border-[#c9a24b]/30 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold font-serif text-[#e8d08a] mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#c9a24b]" />
          वर एवं वधू (Couple Details)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#c9a24b] border-b border-[#c9a24b]/20 pb-1">
              वर पक्ष (Groom)
            </h4>
            <div>
              <label className="block text-xs font-medium text-[#fbf3dc]/80 mb-1">
                वर का पूरा नाम (Groom Full Name)
              </label>
              <input
                type="text"
                value={project.couple.groom}
                onChange={(e) => updateCouple('groom', e.target.value)}
                className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg px-3 py-2 text-sm text-[#fbf3dc] focus:outline-none focus:border-[#e8d08a]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#fbf3dc]/80 mb-1">
                संक्षिप्त नाम (Groom Short Name)
              </label>
              <input
                type="text"
                value={project.couple.groomShort}
                onChange={(e) => updateCouple('groomShort', e.target.value)}
                className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg px-3 py-2 text-sm text-[#fbf3dc] focus:outline-none focus:border-[#e8d08a]"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#fbf3dc]/80">
                वर पक्ष परिचय पंक्तियाँ (सुपौत्र, सुपुत्र, निवास)
              </label>
              {project.families.groom.lines.map((line, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={line}
                  onChange={(e) => updateGroomFamilyLine(idx, e.target.value)}
                  className="w-full bg-[#18080f] border border-[#c9a24b]/30 rounded-lg px-3 py-1.5 text-xs text-[#fbf3dc] focus:outline-none focus:border-[#e8d08a]"
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#c9a24b] border-b border-[#c9a24b]/20 pb-1">
              वधू पक्ष (Bride)
            </h4>
            <div>
              <label className="block text-xs font-medium text-[#fbf3dc]/80 mb-1">
                वधू का पूरा नाम (Bride Full Name)
              </label>
              <input
                type="text"
                value={project.couple.bride}
                onChange={(e) => updateCouple('bride', e.target.value)}
                className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg px-3 py-2 text-sm text-[#fbf3dc] focus:outline-none focus:border-[#e8d08a]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#fbf3dc]/80 mb-1">
                संक्षिप्त नाम (Bride Short Name)
              </label>
              <input
                type="text"
                value={project.couple.brideShort}
                onChange={(e) => updateCouple('brideShort', e.target.value)}
                className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg px-3 py-2 text-sm text-[#fbf3dc] focus:outline-none focus:border-[#e8d08a]"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#fbf3dc]/80">
                वधू पक्ष परिचय पंक्तियाँ (सुपुत्री, निवास)
              </label>
              {project.families.bride.lines.map((line, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={line}
                  onChange={(e) => updateBrideFamilyLine(idx, e.target.value)}
                  className="w-full bg-[#18080f] border border-[#c9a24b]/30 rounded-lg px-3 py-1.5 text-xs text-[#fbf3dc] focus:outline-none focus:border-[#e8d08a]"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ceremonies & Events Section */}
      <section className="bg-[#240e17] border border-[#c9a24b]/30 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold font-serif text-[#e8d08a] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#c9a24b]" />
              मांगलिक कार्यक्रम (Ceremonies & Timeline)
            </h3>
            <p className="text-xs text-[#fbf3dc]/70 mt-0.5">
              प्रत्येक रस्म, समय, स्थान व बारात मार्ग। समय या स्थान रिक्त होने पर स्वतः &apos;समय एवं स्थान की सूचना शीघ्र दी जाएगी&apos; प्रदर्शित होगा।
            </p>
          </div>
          <button
            onClick={addEvent}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6e1f34] hover:bg-[#852740] text-[#e8d08a] border border-[#c9a24b]/50 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            कार्यक्रम जोड़ें
          </button>
        </div>

        <div className="space-y-4">
          {project.events.map((ev, idx) => (
            <div
              key={ev.id}
              className="bg-[#18080f] border border-[#c9a24b]/30 rounded-lg p-4 space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#c9a24b] uppercase tracking-wide">
                  रस्म #{idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveEvent(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 text-[#fbf3dc]/60 hover:text-[#e8d08a] disabled:opacity-30 cursor-pointer"
                    title="ऊपर करें"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveEvent(idx, 1)}
                    disabled={idx === project.events.length - 1}
                    className="p-1 text-[#fbf3dc]/60 hover:text-[#e8d08a] disabled:opacity-30 cursor-pointer"
                    title="नीचे करें"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeEvent(idx)}
                    className="p-1 text-red-400/70 hover:text-red-400 cursor-pointer ml-2"
                    title="हटाएँ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#fbf3dc]/70 mb-1">दिनांक (Date)</label>
                  <input
                    type="date"
                    value={ev.date}
                    onChange={(e) => updateEvent(idx, { date: e.target.value })}
                    className="w-full bg-[#240e17] border border-[#c9a24b]/30 rounded px-2.5 py-1.5 text-xs text-[#fbf3dc]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#fbf3dc]/70 mb-1">वार (Day)</label>
                  <input
                    type="text"
                    value={ev.day}
                    onChange={(e) => updateEvent(idx, { day: e.target.value })}
                    placeholder="उदा० शुक्रवार"
                    className="w-full bg-[#240e17] border border-[#c9a24b]/30 rounded px-2.5 py-1.5 text-xs text-[#fbf3dc]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#fbf3dc]/70 mb-1">समय (Time)</label>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#c9a24b]" />
                    <input
                      type="text"
                      value={ev.time || ''}
                      onChange={(e) => updateEvent(idx, { time: e.target.value || null })}
                      placeholder="उदा० 19:00 या रिक्त रखें"
                      className="w-full bg-[#240e17] border border-[#c9a24b]/30 rounded px-2.5 py-1.5 text-xs text-[#fbf3dc]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#fbf3dc]/70 mb-1">रस्म का नाम (Title)</label>
                <input
                  type="text"
                  value={ev.title}
                  onChange={(e) => updateEvent(idx, { title: e.target.value })}
                  className="w-full bg-[#240e17] border border-[#c9a24b]/40 rounded px-2.5 py-1.5 text-xs text-[#fbf3dc] font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#fbf3dc]/70 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#c9a24b]" />
                    स्थान / वेन्यू (Venue)
                  </label>
                  <input
                    type="text"
                    value={ev.venue || ''}
                    onChange={(e) => updateEvent(idx, { venue: e.target.value || null })}
                    placeholder="रिक्त होने पर 'सूचना शीघ्र' दिखेगा"
                    className="w-full bg-[#240e17] border border-[#c9a24b]/30 rounded px-2.5 py-1.5 text-xs text-[#fbf3dc]"
                  />
                </div>
                {ev.from !== undefined && (
                  <div>
                    <label className="block text-xs text-[#fbf3dc]/70 mb-1">
                      प्रस्थान स्थल (Departure from)
                    </label>
                    <input
                      type="text"
                      value={ev.from || ''}
                      onChange={(e) => updateEvent(idx, { from: e.target.value })}
                      placeholder="बारात प्रस्थान बिंदु"
                      className="w-full bg-[#240e17] border border-[#c9a24b]/30 rounded px-2.5 py-1.5 text-xs text-[#fbf3dc]"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sacred Shlokas & Copy Section */}
      <section className="bg-[#240e17] border border-[#c9a24b]/30 rounded-xl p-6 shadow-lg space-y-4">
        <h3 className="text-lg font-bold font-serif text-[#e8d08a] mb-2">
          श्लोक, वंदना एवं आमंत्रण पाठ (Shlokas & Copy)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#fbf3dc]/80 mb-1">
              गणेश वंदना (Invocation)
            </label>
            <input
              type="text"
              value={project.copy.ganesh}
              onChange={(e) => updateCopy('ganesh', e.target.value)}
              className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg px-3 py-2 text-xs text-[#fbf3dc]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#fbf3dc]/80 mb-1">
              उत्सव शीर्षक (Ceremony Title)
            </label>
            <input
              type="text"
              value={project.copy.title}
              onChange={(e) => updateCopy('title', e.target.value)}
              className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg px-3 py-2 text-xs text-[#fbf3dc]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#fbf3dc]/80 mb-1">
            मंगलम् श्लोक (Mangalam Shloka - Card 1)
          </label>
          <textarea
            rows={2}
            value={project.copy.shloka1}
            onChange={(e) => updateCopy('shloka1', e.target.value)}
            className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg p-2.5 text-xs text-[#fbf3dc]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#fbf3dc]/80 mb-1">
            आमंत्रण संदेश (Main Invitation Body)
          </label>
          <textarea
            rows={2}
            value={project.copy.invitation}
            onChange={(e) => updateCopy('invitation', e.target.value)}
            className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg p-2.5 text-xs text-[#fbf3dc]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#fbf3dc]/80 mb-1">
              दर्शनाभिलाषी (Darshanabhilashi)
            </label>
            <input
              type="text"
              value={project.copy.seen}
              onChange={(e) => updateCopy('seen', e.target.value)}
              className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg px-3 py-2 text-xs text-[#fbf3dc]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#fbf3dc]/80 mb-1">
              आकांक्षी (Well-wishers)
            </label>
            <input
              type="text"
              value={project.copy.wellwishers}
              onChange={(e) => updateCopy('wellwishers', e.target.value)}
              className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg px-3 py-2 text-xs text-[#fbf3dc]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#fbf3dc]/80 mb-1">
            समापन आशीर्वाद संदेश (Closing Blessing Finale Line)
          </label>
          <input
            type="text"
            value={project.copy.closing}
            onChange={(e) => updateCopy('closing', e.target.value)}
            className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg px-3 py-2 text-xs text-[#fbf3dc]"
          />
        </div>
      </section>
    </div>
  );
};
