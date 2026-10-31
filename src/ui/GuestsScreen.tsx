/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, GuestItem } from '../data/schema.ts';
import { videoExporter } from '../export/videoExporter.ts';
import { Users, Plus, Trash2, Download, CheckCircle, PackageOpen, Sparkles } from 'lucide-react';

interface GuestsScreenProps {
  project: Project;
  onChange: (updated: Project) => void;
  onSelectGuestForPreview?: (guest: GuestItem) => void;
}

export const GuestsScreen: React.FC<GuestsScreenProps> = ({
  project,
  onChange,
  onSelectGuestForPreview,
}) => {
  const [bulkText, setBulkText] = useState('');
  const [salutation, setSalutation] = useState('सेवा में,');
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    currentGuest: string;
    guestIdx: number;
    totalGuests: number;
    percent: number;
  } | null>(null);

  const addSingleGuest = (name: string) => {
    if (!name.trim()) return;
    const newGuest: GuestItem = {
      id: `g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      salutation,
      family: true,
    };
    onChange({
      ...project,
      guestList: [...project.guestList, newGuest],
    });
  };

  const addBulkGuests = () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const newGuests: GuestItem[] = lines.map((line, idx) => ({
      id: `g_bulk_${Date.now()}_${idx}`,
      name: line,
      salutation,
      family: true,
    }));

    onChange({
      ...project,
      guestList: [...project.guestList, ...newGuests],
    });
    setBulkText('');
  };

  const removeGuest = (id: string) => {
    onChange({
      ...project,
      guestList: project.guestList.filter((g) => g.id !== id),
    });
  };

  const selectActiveGuest = (guest: GuestItem) => {
    onChange({
      ...project,
      guest,
    });
    onSelectGuestForPreview?.(guest);
  };

  const handleBatchExport = async () => {
    if (project.guestList.length === 0) return;
    setIsBatchExporting(true);
    try {
      const zipBlob = await videoExporter.exportGuestBatchZip(
        project,
        project.export,
        (progress) => {
          setBatchProgress(progress);
        }
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Wedding_Invitations_All_Guests_${project.couple.groomShort}_${project.couple.brideShort}.zip`;
      a.click();
    } catch (err: any) {
      alert(`Batch export error: ${err.message || 'Error occurred'}`);
    } finally {
      setIsBatchExporting(false);
      setBatchProgress(null);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="border-b border-[#c9a24b]/30 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-[#e8d08a] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#c9a24b]" />
            <span>अतिथि सूची व व्यक्तिगत वीडियो (Guests & Batch Export)</span>
          </h2>
          <p className="text-sm text-[#fbf3dc]/70 mt-1">
            प्रत्येक सम्मानित अतिथि के नाम के साथ अलग वीडियो तैयार करें। लिफाफे पर उनका नाम सुलेख में लिखा जाएगा।
          </p>
        </div>

        {/* Batch Export ZIP Button */}
        <button
          onClick={handleBatchExport}
          disabled={isBatchExporting || project.guestList.length === 0}
          className="px-5 py-2.5 bg-gradient-to-r from-[#852740] to-[#6e1f34] hover:from-[#9c2e4b] hover:to-[#852740] text-[#fbf3dc] border border-[#c9a24b] rounded-xl text-xs font-bold font-serif shadow-lg flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40"
        >
          <PackageOpen className="w-4 h-4 text-[#e8d08a]" />
          <span>सभी अतिथियों का ZIP बंडल डाउनलोड करें ({project.guestList.length})</span>
        </button>
      </div>

      {/* Add Guests Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bulk Add Textbox */}
        <div className="bg-[#240e17] border border-[#c9a24b]/30 rounded-xl p-5 space-y-3 shadow-lg">
          <h3 className="text-sm font-bold font-serif text-[#e8d08a] flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#c9a24b]" />
            अतिथियों के नाम जोड़ें (एक पंक्ति में एक नाम)
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#fbf3dc]/70">संबोधन (Salutation):</label>
            <select
              value={salutation}
              onChange={(e) => setSalutation(e.target.value)}
              className="bg-[#18080f] border border-[#c9a24b]/30 rounded px-2.5 py-1 text-xs text-[#fbf3dc]"
            >
              <option value="सेवा में,">सेवा में,</option>
              <option value="सादर सप्रेम,">सादर सप्रेम,</option>
              <option value="आदरणीय">आदरणीय</option>
              <option value="मान्यवर,">मान्यवर,</option>
            </select>
          </div>

          <textarea
            rows={4}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="श्री राजेश कुमार शर्मा एवं परिवार&#10;डॉ० अशोक वर्मा सपरिवार&#10;श्री अनिल गुप्ता जी"
            className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg p-2.5 text-xs text-[#fbf3dc] focus:outline-none focus:border-[#e8d08a]"
          />

          <button
            onClick={addBulkGuests}
            className="w-full py-2 bg-[#6e1f34] hover:bg-[#852740] text-[#e8d08a] border border-[#c9a24b]/50 rounded-lg text-xs font-bold cursor-pointer transition-colors"
          >
            सूची में जोड़ें (Add to List)
          </button>
        </div>

        {/* Current Active Preview Guest */}
        <div className="bg-[#240e17] border border-[#c9a24b]/30 rounded-xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="text-sm font-bold font-serif text-[#e8d08a] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#c9a24b]" />
              वर्तमान सक्रिय पूर्वावलोकन अतिथि
            </h3>
            <p className="text-xs text-[#fbf3dc]/70 mt-1">
              वीडियो पूर्वावलोकन में वर्तमान में यह नाम लिफाफे पर प्रदर्शित हो रहा है:
            </p>

            <div className="mt-4 p-4 bg-[#18080f] rounded-lg border border-[#c9a24b]/30 text-center">
              <span className="text-xs text-[#c9a24b] font-serif block">
                {project.guest.salutation || 'सेवा में,'}
              </span>
              <span className="text-lg font-bold font-serif text-[#ffffff] mt-1 block">
                {project.guest.name}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#fbf3dc]/50 mt-4 text-center">
            नीचे सूची में किसी भी अतिथि पर क्लिक करके उनके नाम से पूर्वावलोकन देख सकते हैं।
          </p>
        </div>
      </div>

      {/* Guest List Cards */}
      <div className="space-y-3">
        <h3 className="text-base font-bold font-serif text-[#e8d08a] flex items-center justify-between">
          <span>कुल अतिथि ({project.guestList.length})</span>
          <span className="text-xs text-[#fbf3dc]/60 font-normal">
            अनुमानित बैच समय: ~{Math.ceil((project.guestList.length * 15) / 60)} मिनट
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {project.guestList.map((g, idx) => {
            const isActive = project.guest.id === g.id || project.guest.name === g.name;

            return (
              <div
                key={g.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-[#3b1220] border-[#c9a24b] shadow-md'
                    : 'bg-[#1e0a13] border-[#c9a24b]/25 hover:border-[#c9a24b]/50'
                }`}
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => selectActiveGuest(g)}
                >
                  <span className="text-[10px] text-[#c9a24b] font-medium block">
                    {g.salutation || 'सेवा में,'}
                  </span>
                  <span className="text-xs font-semibold text-[#ffffff] line-clamp-1">
                    {g.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => selectActiveGuest(g)}
                    className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#6e1f34] text-[#e8d08a] border border-[#c9a24b]/60'
                        : 'text-[#fbf3dc]/60 hover:text-[#fbf3dc]'
                    }`}
                  >
                    {isActive ? 'सक्रिय' : 'चुनें'}
                  </button>
                  <button
                    onClick={() => removeGuest(g.id)}
                    className="p-1 text-red-400/60 hover:text-red-400 cursor-pointer"
                    title="हटाएँ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch Export Progress Dialog */}
      {isBatchExporting && batchProgress && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#240e17] border-2 border-[#c9a24b] rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold font-serif text-[#e8d08a]">
              बैच आमंत्रण वीडियो निर्माण जारी...
            </h3>
            <p className="text-xs text-[#fbf3dc]/80">
              अतिथि {batchProgress.guestIdx} / {batchProgress.totalGuests}: <strong>{batchProgress.currentGuest}</strong>
            </p>
            <div className="w-full h-3 bg-[#14060c] rounded-full overflow-hidden border border-[#c9a24b]/40">
              <div
                className="h-full bg-gradient-to-r from-[#c9a24b] to-[#ffd700]"
                style={{ width: `${batchProgress.percent}%` }}
              />
            </div>
            <p className="text-xs text-[#fbf3dc]/60">
              पूर्ण होने पर सभी वीडियो एक .ZIP फ़ाइल में स्वतः डाउनलोड हो जाएँगे।
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
