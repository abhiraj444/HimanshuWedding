/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Project, SceneConfig } from '../data/schema.ts';
import { Film, Clock, Eye, EyeOff, ArrowUp, ArrowDown, Image as ImageIcon, Type, Sparkles } from 'lucide-react';

interface ScenesScreenProps {
  project: Project;
  onChange: (updated: Project) => void;
  onPreviewTimeJump?: (seconds: number) => void;
}

export const ScenesScreen: React.FC<ScenesScreenProps> = ({
  project,
  onChange,
  onPreviewTimeJump,
}) => {
  const toggleScene = (idx: number) => {
    const scenes = [...project.scenes];
    scenes[idx] = { ...scenes[idx], enabled: !scenes[idx].enabled };
    recalcStartTimes(scenes);
  };

  const updateDuration = (idx: number, duration: number) => {
    const scenes = [...project.scenes];
    scenes[idx] = { ...scenes[idx], duration: Math.max(1, duration) };
    recalcStartTimes(scenes);
  };

  const moveScene = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= project.scenes.length) return;
    const scenes = [...project.scenes];
    const temp = scenes[idx];
    scenes[idx] = scenes[newIdx];
    scenes[newIdx] = temp;
    recalcStartTimes(scenes);
  };

  const recalcStartTimes = (scenes: SceneConfig[]) => {
    let currentStart = 0;
    const updated = scenes.map((s) => {
      const sc = { ...s, start: currentStart };
      if (sc.enabled) {
        currentStart += sc.duration;
      }
      return sc;
    });
    onChange({ ...project, scenes: updated });
  };

  const toggleCardMode = (cardKey: 'card1' | 'card2', mode: 'photo' | 'typeset') => {
    onChange({
      ...project,
      cards: {
        ...project.cards,
        [cardKey]: {
          ...project.cards[cardKey],
          mode,
        },
      },
    });
  };

  const totalDuration = project.scenes.reduce(
    (acc, s) => acc + (s.enabled ? s.duration : 0),
    0
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="border-b border-[#c9a24b]/30 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-[#e8d08a] flex items-center gap-2">
            <Film className="w-6 h-6 text-[#c9a24b]" />
            <span>दृश्य एवं समयरेखा (Scenes & Timeline)</span>
          </h2>
          <p className="text-sm text-[#fbf3dc]/70 mt-1">
            प्रत्येक दृश्य की अवधि बदलें, क्रम बदलें, या कार्ड को असली फोटो अथवा डिज़िटल रूप में प्रदर्शित करें।
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-[#fbf3dc]/70 block">कुल वीडियो अवधि</span>
          <span className="text-lg font-bold font-mono text-[#e8d08a]">
            {Math.floor(totalDuration / 60)}:
            {String(Math.floor(totalDuration % 60)).padStart(2, '0')} min
          </span>
        </div>
      </div>

      {/* Card Display Mode Selection (Photo Mode vs Typeset Mode) */}
      <section className="bg-[#240e17] border border-[#c9a24b]/40 rounded-xl p-5 shadow-lg space-y-4">
        <h3 className="text-base font-bold font-serif text-[#e8d08a] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#c9a24b]" />
          कार्ड प्रदर्शन शैली (Card Display Mode)
        </h3>
        <p className="text-xs text-[#fbf3dc]/70">
          असली छपे हुए कार्ड की फोटो पर स्पॉटलाइट दिखाएँ (Photo Mode) अथवा यदि आपने विवरण में परिवर्तन किया है तो नए सिरे से सुंदर रूप में टाइप्सैट करें (Typeset Mode)।
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Card 1 Mode */}
          <div className="bg-[#18080f] p-4 rounded-lg border border-[#c9a24b]/20 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[#fbf3dc]">प्रथम पत्र (Card 1: Couple)</h4>
              <span className="text-xs text-[#c9a24b]">
                {project.cards.card1.mode === 'photo' ? 'असली फोटो स्पॉटलाइट' : 'डिजिटल टाइप्सैट मोड'}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-[#240e17] p-1 rounded-lg border border-[#c9a24b]/30">
              <button
                onClick={() => toggleCardMode('card1', 'photo')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  project.cards.card1.mode === 'photo'
                    ? 'bg-[#6e1f34] text-[#e8d08a]'
                    : 'text-[#fbf3dc]/60 hover:text-[#fbf3dc]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Photo
              </button>
              <button
                onClick={() => toggleCardMode('card1', 'typeset')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  project.cards.card1.mode === 'typeset'
                    ? 'bg-[#6e1f34] text-[#e8d08a]'
                    : 'text-[#fbf3dc]/60 hover:text-[#fbf3dc]'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                Typeset
              </button>
            </div>
          </div>

          {/* Card 2 Mode */}
          <div className="bg-[#18080f] p-4 rounded-lg border border-[#c9a24b]/20 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[#fbf3dc]">द्वितीय पत्र (Card 2: Events)</h4>
              <span className="text-xs text-[#c9a24b]">
                {project.cards.card2.mode === 'photo' ? 'असली फोटो स्पॉटलाइट' : 'डिजिटल टाइप्सैट मोड'}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-[#240e17] p-1 rounded-lg border border-[#c9a24b]/30">
              <button
                onClick={() => toggleCardMode('card2', 'photo')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  project.cards.card2.mode === 'photo'
                    ? 'bg-[#6e1f34] text-[#e8d08a]'
                    : 'text-[#fbf3dc]/60 hover:text-[#fbf3dc]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Photo
              </button>
              <button
                onClick={() => toggleCardMode('card2', 'typeset')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  project.cards.card2.mode === 'typeset'
                    ? 'bg-[#6e1f34] text-[#e8d08a]'
                    : 'text-[#fbf3dc]/60 hover:text-[#fbf3dc]'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                Typeset
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Scenes List */}
      <div className="space-y-3">
        {project.scenes.map((scene, idx) => {
          const startMin = Math.floor(scene.start / 60);
          const startSec = Math.floor(scene.start % 60);
          const endSec = scene.start + scene.duration;
          const endMin = Math.floor(endSec / 60);
          const endSecMod = Math.floor(endSec % 60);

          return (
            <div
              key={scene.id}
              className={`p-4 rounded-xl border transition-all ${
                scene.enabled
                  ? 'bg-[#240e17] border-[#c9a24b]/40 shadow-md'
                  : 'bg-[#18080f]/60 border-[#c9a24b]/10 opacity-60'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Scene Info */}
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#18080f] border border-[#c9a24b]/40 text-[#e8d08a] font-mono text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold font-serif text-[#e8d08a]">
                        {scene.titleHi}
                      </h4>
                      <span className="text-xs text-[#fbf3dc]/60">({scene.title})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#fbf3dc]/70 mt-0.5">
                      <span className="font-mono text-[#c9a24b]">
                        {startMin}:{String(startSec).padStart(2, '0')} - {endMin}:
                        {String(endSecMod).padStart(2, '0')}
                      </span>
                      <span>·</span>
                      <span>अवधि: {scene.duration}s</span>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  {/* Jump to time button */}
                  {onPreviewTimeJump && (
                    <button
                      onClick={() => onPreviewTimeJump(scene.start)}
                      className="px-2.5 py-1 bg-[#18080f] hover:bg-[#341421] text-[#e8d08a] border border-[#c9a24b]/30 rounded text-xs cursor-pointer transition-colors"
                      title="इस दृश्य पर प्लेहेड ले जाएँ"
                    >
                      दृश्य देखें
                    </button>
                  )}

                  {/* Duration Slider */}
                  <div className="flex items-center gap-2 bg-[#18080f] px-3 py-1.5 rounded-lg border border-[#c9a24b]/30">
                    <Clock className="w-3.5 h-3.5 text-[#c9a24b]" />
                    <input
                      type="range"
                      min="2"
                      max="25"
                      value={scene.duration}
                      onChange={(e) => updateDuration(idx, Number(e.target.value))}
                      className="w-20 accent-[#c9a24b]"
                    />
                    <span className="text-xs font-mono text-[#e8d08a] w-8 text-right">
                      {scene.duration}s
                    </span>
                  </div>

                  {/* Move Up/Down */}
                  <div className="flex items-center">
                    <button
                      onClick={() => moveScene(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 text-[#fbf3dc]/60 hover:text-[#e8d08a] disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveScene(idx, 1)}
                      disabled={idx === project.scenes.length - 1}
                      className="p-1.5 text-[#fbf3dc]/60 hover:text-[#e8d08a] disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Toggle Enabled */}
                  <button
                    onClick={() => toggleScene(idx)}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                      scene.enabled
                        ? 'bg-[#6e1f34] text-[#e8d08a] border-[#c9a24b]/40'
                        : 'bg-[#18080f] text-[#fbf3dc]/40 border-white/10'
                    }`}
                    title={scene.enabled ? 'दृश्य अक्षम करें' : 'दृश्य सक्षम करें'}
                  >
                    {scene.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
