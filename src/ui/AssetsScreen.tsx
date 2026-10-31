/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Project, AssetSlotId, AssetRef } from '../data/schema.ts';
import { Upload, Sliders, Eraser, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { imagePreloader, saveAssetImageBlob } from '../assets/store.ts';
import { applyColorAdjustments, applyErasePatch, ColorAdjustment } from '../assets/imageTools.ts';

interface AssetsScreenProps {
  project: Project;
  onChange: (updated: Project) => void;
}

export const AssetsScreen: React.FC<AssetsScreenProps> = ({ project, onChange }) => {
  const [activeSlot, setActiveSlot] = useState<AssetSlotId | null>(null);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<'erase' | 'adjust'>('erase');
  const [brushSize, setBrushSize] = useState(25);
  const [adjustments, setAdjustments] = useState<ColorAdjustment>({
    brightness: 0,
    contrast: 0,
    warmth: 5,
    saturation: 5,
  });

  const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPaintingRef = useRef(false);

  const slotLabels: Record<AssetSlotId, { name: string; desc: string }> = {
    envelopeFront: {
      name: 'लिफ़ाफ़ा अग्रभाग (Envelope Front)',
      desc: 'सामने का भाग, जिस पर श्री गणेशाय, युगल नाम एवं सेवा में अंकित है।',
    },
    envelopeBack: {
      name: 'लिफ़ाफ़ा पृष्ठभाग (Envelope Back)',
      desc: 'पीछे का भाग, जहाँ से शाही 3D फ्लैप खुलता है।',
    },
    envelopeFlap: {
      name: 'शाही मुहर व फ्लैप (Flap & Seal)',
      desc: 'लिफाफे का ढक्कन एवं स्वर्ण मुहर।',
    },
    folderCover: {
      name: 'शाही फोल्डर द्वार (Folder Doors)',
      desc: 'वर-वधू की भव्य शाही झांकी वाले दोनों द्वार।',
    },
    folderInside: {
      name: 'फोल्डर आंतरिक झांकी (Folder Interior)',
      desc: 'शाही हाथी बारात एवं आंतरिक साज-सज्जा।',
    },
    card1: {
      name: 'प्रथम पत्र (Card 1: Groom & Bride)',
      desc: 'वर-वधू व दोनों परिवारों का परिचय पत्र (हरा पृष्ठभूमि)।',
    },
    card2: {
      name: 'द्वितीय पत्र (Card 2: Ceremonies)',
      desc: 'मांगलिक कार्यक्रम, रस्में एवं वेन्यू विवरण (क्रीम पृष्ठभूमि)।',
    },
    groomFigure: {
      name: 'वर चित्रण (Groom Illustration)',
      desc: 'शाही शेरवानी व सेहरा युक्त वर आकृति।',
    },
    brideFigure: {
      name: 'वधू चित्रण (Bride Illustration)',
      desc: 'लाल शाही लहंगा व चुनरी युक्त वधू आकृति।',
    },
    musicTrack: {
      name: 'मांगलिक संगीत (Music Track)',
      desc: 'शहनाई, सितार एवं मंगल ध्वनि (डिफ़ॉल्ट प्रक्रियात्मक संगीत सक्रिय)।',
    },
  };

  const openEditor = (slotId: AssetSlotId) => {
    const asset = project.assets[slotId];
    if (!asset || !asset.url) return;
    setActiveSlot(slotId);
    setEditingImage(asset.url);

    setTimeout(() => {
      const canvas = editorCanvasRef.current;
      if (!canvas) return;
      const img = imagePreloader.getImage(asset.url) || new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
      };
      if (img.complete && img.naturalWidth > 0) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
      } else {
        img.src = asset.url;
      }
    }, 100);
  };

  const handleFileUpload = (slotId: AssetSlotId, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const updatedRef: AssetRef = {
        slotId,
        name: file.name,
        url: dataUrl,
        originalUrl: dataUrl,
        isCustomUpload: true,
      };

      onChange({
        ...project,
        assets: {
          ...project.assets,
          [slotId]: updatedRef,
        },
      });

      saveAssetImageBlob(slotId, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Erase Tool Drawing
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (toolMode !== 'erase') return;
    isPaintingRef.current = true;
    paintErase(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaintingRef.current || toolMode !== 'erase') return;
    paintErase(e);
  };

  const handleCanvasMouseUp = () => {
    isPaintingRef.current = false;
  };

  const paintErase = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    applyErasePatch(canvas, x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
  };

  const saveEditedImage = () => {
    const canvas = editorCanvasRef.current;
    if (!canvas || !activeSlot) return;

    let finalCanvas = canvas;
    if (toolMode === 'adjust') {
      finalCanvas = applyColorAdjustments(canvas, adjustments);
    }

    const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.92);
    const existing = project.assets[activeSlot];

    const updatedRef: AssetRef = {
      slotId: activeSlot,
      name: `${existing?.name || activeSlot} (Cleaned)`,
      url: dataUrl,
      originalUrl: existing?.originalUrl || existing?.url,
      isCustomUpload: true,
    };

    // Update memory cache
    const img = new Image();
    img.src = dataUrl;
    imagePreloader.setCache(dataUrl, img);

    onChange({
      ...project,
      assets: {
        ...project.assets,
        [activeSlot]: updatedRef,
      },
    });

    saveAssetImageBlob(activeSlot, dataUrl);
    setActiveSlot(null);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="border-b border-[#c9a24b]/30 pb-4">
        <h2 className="text-2xl font-bold font-serif text-[#e8d08a] flex items-center gap-2">
          <span>चित्र व मीडिया गैलरी (Assets & Tools)</span>
          <span className="text-xs text-[#c9a24b] font-normal tracking-wide px-2 py-0.5 rounded border border-[#c9a24b]/40">
            Card Photos
          </span>
        </h2>
        <p className="text-sm text-[#fbf3dc]/70 mt-1">
          कार्ड के 7 असली फोटो पहले से जुड़े हैं। आप किसी भी फोटो को बदल सकते हैं, गोपनीयता हेतु फोन नंबर या खाली लाइन मिटा सकते हैं।
        </p>
      </div>

      {/* Asset Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(Object.keys(slotLabels) as AssetSlotId[]).map((slotId) => {
          const slotMeta = slotLabels[slotId];
          const asset = project.assets[slotId];

          return (
            <div
              key={slotId}
              className="bg-[#240e17] border border-[#c9a24b]/30 rounded-xl overflow-hidden flex flex-col justify-between shadow-lg"
            >
              {/* Image Preview */}
              <div className="h-44 bg-[#14060c] relative flex items-center justify-center p-2 overflow-hidden group">
                {asset?.url ? (
                  <img
                    src={asset.url}
                    alt={slotMeta.name}
                    className="max-h-full max-w-full object-contain rounded transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="text-center p-4 text-[#fbf3dc]/40">
                    <p className="text-xs">डिफ़ॉल्ट प्रक्रियात्मक चित्रण सक्रिय</p>
                  </div>
                )}
                {asset?.url && (
                  <button
                    onClick={() => openEditor(slotId)}
                    className="absolute bottom-2 right-2 px-2.5 py-1 bg-[#4a1224]/90 hover:bg-[#6e1f34] text-[#e8d08a] border border-[#c9a24b]/50 rounded text-xs flex items-center gap-1 shadow cursor-pointer"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    टूल व संपादन
                  </button>
                )}
              </div>

              {/* Slot Details */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold font-serif text-[#e8d08a]">
                    {slotMeta.name}
                  </h4>
                  <p className="text-xs text-[#fbf3dc]/70 mt-1 line-clamp-2">
                    {slotMeta.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#c9a24b]/20 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18080f] hover:bg-[#2d121e] text-[#fbf3dc] border border-[#c9a24b]/30 rounded-lg text-xs cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#c9a24b]" />
                    <span>फ़ोटो बदलें</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(slotId, file);
                      }}
                    />
                  </label>
                  {asset?.url && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      सक्रिय
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Editor Modal (Eraser & Color Tools) */}
      {activeSlot && editingImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#240e17] border border-[#c9a24b] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#c9a24b]/30 flex items-center justify-between bg-[#1a0910]">
              <div>
                <h3 className="text-lg font-bold font-serif text-[#e8d08a] flex items-center gap-2">
                  <Eraser className="w-5 h-5 text-[#c9a24b]" />
                  <span>चित्र स्वच्छता एवं गोपनीयता टूल (Asset Cleanup & Privacy)</span>
                </h3>
                <p className="text-xs text-[#fbf3dc]/70">
                  व्यक्तिगत फोन नंबर या रिक्त रेखाओं को ब्रश से आसानी से मिटाएँ।
                </p>
              </div>

              {/* Tool Mode Tabs */}
              <div className="flex items-center gap-1 bg-[#12060b] p-1 rounded-lg border border-[#c9a24b]/30">
                <button
                  onClick={() => setToolMode('erase')}
                  className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                    toolMode === 'erase' ? 'bg-[#6e1f34] text-[#e8d08a]' : 'text-[#fbf3dc]/70'
                  }`}
                >
                  गोपनीयता इरेज़र (Erase)
                </button>
                <button
                  onClick={() => setToolMode('adjust')}
                  className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                    toolMode === 'adjust' ? 'bg-[#6e1f34] text-[#e8d08a]' : 'text-[#fbf3dc]/70'
                  }`}
                >
                  रंग संतुलन (Adjust)
                </button>
              </div>
            </div>

            {/* Canvas Workspace */}
            <div className="flex-1 overflow-auto bg-[#100408] p-4 flex items-center justify-center relative">
              <canvas
                ref={editorCanvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="max-h-[60vh] max-w-full object-contain border border-[#c9a24b]/40 rounded shadow-md cursor-crosshair"
              />
            </div>

            {/* Controls Toolbar */}
            <div className="p-4 bg-[#1a0910] border-t border-[#c9a24b]/30 space-y-3">
              {toolMode === 'erase' ? (
                <div className="flex items-center gap-4">
                  <span className="text-xs text-[#fbf3dc]/80 font-medium">ब्रश आकार (Brush):</span>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-48 accent-[#c9a24b]"
                  />
                  <span className="text-xs text-[#c9a24b]">{brushSize}px</span>
                  <span className="text-xs text-[#fbf3dc]/60 ml-auto">
                    टिप: कार्ड के फोन नंबर या लाइन पर क्लिक करके ड्रैग करें
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="text-[#fbf3dc]/80 block mb-1">चमक (Brightness)</label>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      value={adjustments.brightness}
                      onChange={(e) =>
                        setAdjustments({ ...adjustments, brightness: Number(e.target.value) })
                      }
                      className="w-full accent-[#c9a24b]"
                    />
                  </div>
                  <div>
                    <label className="text-[#fbf3dc]/80 block mb-1">कंट्रास्ट (Contrast)</label>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      value={adjustments.contrast}
                      onChange={(e) =>
                        setAdjustments({ ...adjustments, contrast: Number(e.target.value) })
                      }
                      className="w-full accent-[#c9a24b]"
                    />
                  </div>
                  <div>
                    <label className="text-[#fbf3dc]/80 block mb-1">स्वर्ण गर्माहट (Warmth)</label>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      value={adjustments.warmth}
                      onChange={(e) =>
                        setAdjustments({ ...adjustments, warmth: Number(e.target.value) })
                      }
                      className="w-full accent-[#c9a24b]"
                    />
                  </div>
                  <div>
                    <label className="text-[#fbf3dc]/80 block mb-1">संतृप्ति (Saturation)</label>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      value={adjustments.saturation}
                      onChange={(e) =>
                        setAdjustments({ ...adjustments, saturation: Number(e.target.value) })
                      }
                      className="w-full accent-[#c9a24b]"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setActiveSlot(null)}
                  className="px-4 py-2 bg-transparent hover:bg-white/5 text-[#fbf3dc]/80 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  onClick={saveEditedImage}
                  className="px-5 py-2 bg-[#6e1f34] hover:bg-[#852740] text-[#e8d08a] border border-[#c9a24b] rounded-lg text-xs font-bold shadow cursor-pointer transition-colors"
                >
                  सुरक्षित करें (Apply & Save)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
