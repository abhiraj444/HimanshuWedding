/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, GuestItem } from './data/schema.ts';
import { DEFAULT_PROJECT } from './data/defaultProject.ts';
import { saveProjectToDB, loadProjectFromDB, imagePreloader } from './assets/store.ts';
import { DetailsScreen } from './ui/DetailsScreen.tsx';
import { AssetsScreen } from './ui/AssetsScreen.tsx';
import { ScenesScreen } from './ui/ScenesScreen.tsx';
import { PreviewExportScreen } from './ui/PreviewExportScreen.tsx';
import { GuestsScreen } from './ui/GuestsScreen.tsx';
import {
  FileText,
  Image as ImageIcon,
  Film,
  PlayCircle,
  Users,
  Save,
  DownloadCloud,
  UploadCloud,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

type TabType = 'details' | 'assets' | 'scenes' | 'preview' | 'guests';

export default function App() {
  const [project, setProject] = useState<Project>(DEFAULT_PROJECT);
  const [activeTab, setActiveTab] = useState<TabType>('preview');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [jumpTime, setJumpTime] = useState<number | null>(null);

  // Load saved project from IndexedDB on startup & preload assets
  useEffect(() => {
    loadProjectFromDB().then((saved) => {
      setProject(saved);

      // Preload images
      const urls = Object.values(saved.assets)
        .map((a) => a?.url)
        .filter(Boolean);
      imagePreloader.preloadAll(urls);
    });

    // Check ?autostart=1 or ?tab=
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as TabType;
    if (tabParam && ['details', 'assets', 'scenes', 'preview', 'guests'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleProjectChange = (updated: Project) => {
    setProject(updated);
    saveProjectToDB(updated);
    setSaveStatus('परिवर्तन सहेजे गए');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleManualSave = async () => {
    await saveProjectToDB(project);
    setSaveStatus('परियोजना सुरक्षित!');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const exportProjectJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `Wedding_Project_${project.couple.groomShort}_${project.couple.brideShort}.json`);
    dlAnchor.click();
  };

  const importProjectJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.version && parsed.couple) {
          handleProjectChange(parsed);
          alert('परियोजना सफलतापूर्वक लोड हो गई!');
        }
      } catch (err) {
        alert('अमान्य JSON फ़ाइल');
      }
    };
    reader.readAsText(file);
  };

  const resetToDefault = () => {
    if (confirm('क्या आप डिफ़ॉल्ट कार्ड विवरण पुनः लोड करना चाहते हैं?')) {
      handleProjectChange(DEFAULT_PROJECT);
    }
  };

  const handleSceneTimeJump = (t: number) => {
    setJumpTime(t);
    setActiveTab('preview');
  };

  const handleSelectGuest = (guest: GuestItem) => {
    setProject((prev) => ({
      ...prev,
      guest,
    }));
    setActiveTab('preview');
  };

  return (
    <div className="min-h-screen bg-[#14060c] text-[#fbf3dc] flex flex-col selection:bg-[#c9a24b] selection:text-[#4a1224]">
      {/* Top Royal Header */}
      <header className="bg-gradient-to-r from-[#240e17] via-[#3d1222] to-[#240e17] border-b border-[#c9a24b]/40 shadow-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a24b] to-[#8b1c2b] flex items-center justify-center border border-[#ffd700] shadow-md">
              <span className="font-serif font-bold text-lg text-[#14060c]">ॐ</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-serif text-[#ffd700] tracking-wide">
                  विवाह वीडियो स्टूडियो
                </h1>
                <span className="text-[10px] bg-[#6e1f34] text-[#e8d08a] px-2 py-0.5 rounded border border-[#c9a24b]/40 font-mono">
                  v1.0 1080x1920 MP4
                </span>
              </div>
              <p className="text-xs text-[#fbf3dc]/70">
                {project.couple.groomShort} संग {project.couple.brideShort} • पावन परिणयोत्सव
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 text-xs">
            {saveStatus && (
              <span className="text-emerald-400 font-medium px-2 py-1 bg-emerald-950/60 rounded border border-emerald-500/30">
                {saveStatus}
              </span>
            )}
            <button
              onClick={handleManualSave}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#18080f] hover:bg-[#2e101f] text-[#e8d08a] border border-[#c9a24b]/40 rounded-lg cursor-pointer transition-colors"
              title="ब्राउज़र में सहेजें (IndexedDB)"
            >
              <Save className="w-3.5 h-3.5" />
              <span>सहेजें</span>
            </button>
            <button
              onClick={exportProjectJson}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#18080f] hover:bg-[#2e101f] text-[#fbf3dc]/80 border border-[#c9a24b]/20 rounded-lg cursor-pointer transition-colors"
              title="JSON बैकअप डाउनलोड"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON</span>
            </button>
            <label className="flex items-center gap-1 px-2.5 py-1.5 bg-[#18080f] hover:bg-[#2e101f] text-[#fbf3dc]/80 border border-[#c9a24b]/20 rounded-lg cursor-pointer transition-colors">
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">आयात</span>
              <input type="file" accept=".json" onChange={importProjectJson} className="hidden" />
            </label>
            <button
              onClick={resetToDefault}
              className="p-1.5 text-[#fbf3dc]/50 hover:text-red-300 rounded cursor-pointer"
              title="डिफ़ॉल्ट पुनः लोड करें"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-[#c9a24b]/20 pt-1">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold cursor-pointer border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'preview'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#6e1f34]/30'
                : 'border-transparent text-[#fbf3dc]/70 hover:text-[#fbf3dc]'
            }`}
          >
            <PlayCircle className="w-4 h-4 text-[#c9a24b]" />
            <span>पूर्वावलोकन व निर्यात (Preview & Export)</span>
          </button>

          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold cursor-pointer border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'details'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#6e1f34]/30'
                : 'border-transparent text-[#fbf3dc]/70 hover:text-[#fbf3dc]'
            }`}
          >
            <FileText className="w-4 h-4 text-[#c9a24b]" />
            <span>कार्ड विवरण (Details)</span>
          </button>

          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold cursor-pointer border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'assets'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#6e1f34]/30'
                : 'border-transparent text-[#fbf3dc]/70 hover:text-[#fbf3dc]'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-[#c9a24b]" />
            <span>चित्र व मीडिया (Assets)</span>
          </button>

          <button
            onClick={() => setActiveTab('scenes')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold cursor-pointer border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'scenes'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#6e1f34]/30'
                : 'border-transparent text-[#fbf3dc]/70 hover:text-[#fbf3dc]'
            }`}
          >
            <Film className="w-4 h-4 text-[#c9a24b]" />
            <span>दृश्य व टाइमलाइन (Scenes)</span>
          </button>

          <button
            onClick={() => setActiveTab('guests')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold cursor-pointer border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'guests'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#6e1f34]/30'
                : 'border-transparent text-[#fbf3dc]/70 hover:text-[#fbf3dc]'
            }`}
          >
            <Users className="w-4 h-4 text-[#c9a24b]" />
            <span>अतिथि व बैच (Guests Batch)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'preview' && (
          <PreviewExportScreen
            project={project}
            onChange={handleProjectChange}
            externalJumpTime={jumpTime}
            onClearExternalJump={() => setJumpTime(null)}
          />
        )}

        {activeTab === 'details' && (
          <DetailsScreen project={project} onChange={handleProjectChange} />
        )}

        {activeTab === 'assets' && (
          <AssetsScreen project={project} onChange={handleProjectChange} />
        )}

        {activeTab === 'scenes' && (
          <ScenesScreen
            project={project}
            onChange={handleProjectChange}
            onPreviewTimeJump={handleSceneTimeJump}
          />
        )}

        {activeTab === 'guests' && (
          <GuestsScreen
            project={project}
            onChange={handleProjectChange}
            onSelectGuestForPreview={handleSelectGuest}
          />
        )}
      </main>
    </div>
  );
}
