/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Project, ExportSettings } from '../data/schema.ts';
import { renderFrame, getTotalDuration, RenderContext } from '../engine/renderFrame.ts';
import { weddingAudio } from '../engine/audioSynthesizer.ts';
import { videoExporter, ExportProgress } from '../export/videoExporter.ts';
import { extractProofItems } from '../text/proofSheet.ts';
import { ProofSheetModal } from './ProofSheetModal.tsx';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Share2,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

interface PreviewExportScreenProps {
  project: Project;
  onChange: (updated: Project) => void;
  externalJumpTime?: number | null;
  onClearExternalJump?: () => void;
}

export const PreviewExportScreen: React.FC<PreviewExportScreenProps> = ({
  project,
  onChange,
  externalJumpTime,
  onClearExternalJump,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<{ mp4Url: string; posterUrl: string } | null>(null);

  const totalDuration = getTotalDuration(project.scenes);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Jump to external time requested from Scenes tab
  useEffect(() => {
    if (externalJumpTime !== undefined && externalJumpTime !== null) {
      setCurrentTime(externalJumpTime);
      onClearExternalJump?.();
    }
  }, [externalJumpTime, onClearExternalJump]);

  // Handle live canvas draw
  const drawAtTime = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderCtx: RenderContext = {
        canvas,
        ctx,
        width: canvas.width,
        height: canvas.height,
        scale: canvas.width / 1080,
      };

      renderFrame(project, t, renderCtx);
    },
    [project]
  );

  // Redraw when currentTime or project updates
  useEffect(() => {
    drawAtTime(currentTime);
  }, [currentTime, drawAtTime]);

  // Animation Loop for live playback
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      lastTimestampRef.current = null;
      weddingAudio.stopPreview();
      return;
    }

    if (!isMuted) {
      weddingAudio.playPreview(currentTime, totalDuration, project.audio.volume);
    }

    const step = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const deltaSec = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      setCurrentTime((prev) => {
        const next = prev + deltaSec;
        if (next >= totalDuration) {
          if (isLooping) {
            if (!isMuted) weddingAudio.playPreview(0, totalDuration, project.audio.volume);
            return 0;
          } else {
            setIsPlaying(false);
            return totalDuration;
          }
        }
        return next;
      });

      animFrameIdRef.current = requestAnimationFrame(step);
    };

    animFrameIdRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      weddingAudio.stopPreview();
    };
  }, [isPlaying, isLooping, isMuted, totalDuration, project.audio.volume]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newT = Number(e.target.value);
    setCurrentTime(newT);
    if (isPlaying && !isMuted) {
      weddingAudio.playPreview(newT, totalDuration, project.audio.volume);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      weddingAudio.stopPreview();
    } else if (isPlaying) {
      weddingAudio.playPreview(currentTime, totalDuration, project.audio.volume);
    }
  };

  // Proof Sheet Status
  const proofItems = extractProofItems(project);
  const unverifiedCount = proofItems.filter((i) => i.status === 'unverified').length;

  const toggleProofApproval = (id: string) => {
    onChange({
      ...project,
      proofApprovals: {
        ...project.proofApprovals,
        [id]: !project.proofApprovals[id],
      },
    });
  };

  const approveAllProof = () => {
    const approvals: Record<string, boolean> = {};
    proofItems.forEach((i) => {
      approvals[i.id] = true;
    });
    onChange({
      ...project,
      proofApprovals: approvals,
    });
  };

  // Export execution
  const handleExport = async () => {
    setIsPlaying(false);
    weddingAudio.stopPreview();
    setIsExporting(true);
    setDownloadUrls(null);

    try {
      const { mp4Blob, posterBlob } = await videoExporter.exportProjectMP4(
        project,
        project.export,
        (progress) => {
          setExportProgress(progress);
        }
      );

      const mp4Url = URL.createObjectURL(mp4Blob);
      const posterUrl = URL.createObjectURL(posterBlob);
      setDownloadUrls({ mp4Url, posterUrl });

      // Trigger automatic MP4 download
      const a = document.createElement('a');
      a.href = mp4Url;
      a.download = `Wedding_Invitation_${project.couple.groomShort}_${project.couple.brideShort}.mp4`;
      a.click();
    } catch (err: any) {
      if (err?.message !== 'Export cancelled by user') {
        alert(`Export failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const cancelExport = () => {
    videoExporter.cancel();
    setIsExporting(false);
    setExportProgress(null);
  };

  const handleShare = async () => {
    if (!downloadUrls?.mp4Url) return;
    try {
      if (navigator.share) {
        const response = await fetch(downloadUrls.mp4Url);
        const blob = await response.blob();
        const file = new File([blob], 'Wedding_Invitation.mp4', { type: 'video/mp4' });
        await navigator.share({
          title: `${project.couple.groom} संग ${project.couple.bride} - पावन परिणयोत्सव`,
          text: 'पावन परिणयोत्सव के शुभ अवसर पर आप सपरिवार सादर आमंत्रित हैं।',
          files: [file],
        });
      }
    } catch (err) {
      console.log('Share dismissed', err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Proof Warning Bar */}
      {unverifiedCount > 0 ? (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>सूचना:</strong> {unverifiedCount} पंक्तियों का वर्तनी सत्यापन शेष है। निर्यात से पूर्व प्रूफ़ शीट की जाँच करें।
            </span>
          </div>
          <button
            onClick={() => setIsProofModalOpen(true)}
            className="px-3 py-1 bg-[#6e1f34] hover:bg-[#852740] text-[#e8d08a] border border-[#c9a24b]/40 rounded-lg font-bold cursor-pointer transition-colors"
          >
            प्रूफ़ शीट खोलें (Open Proof Sheet)
          </button>
        </div>
      ) : (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>सभी देवनागरी पंक्तियाँ व तिथियाँ स्वामी द्वारा सत्यापित हैं (All strings verified)</span>
          </div>
          <button
            onClick={() => setIsProofModalOpen(true)}
            className="px-2.5 py-1 text-emerald-300 hover:text-white underline cursor-pointer"
          >
            समीक्षा करें
          </button>
        </div>
      )}

      {/* Main Studio Player Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 9:16 Canvas Player */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative w-full max-w-[340px] aspect-[9/16] bg-[#0c0306] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#c9a24b]/60 flex items-center justify-center group">
            {/* 9:16 Canvas (540x960 for crisp preview) */}
            <canvas
              ref={canvasRef}
              width={540}
              height={960}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
            />

            {/* Play Overlay Icon when paused */}
            {!isPlaying && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-[#6e1f34]/90 border border-[#c9a24b] text-[#e8d08a] flex items-center justify-center shadow-lg transition-transform hover:scale-110">
                  <Play className="w-7 h-7 ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* Scrubber & Player Controls */}
          <div className="w-full max-w-[340px] mt-3 space-y-2">
            {/* Scrubber Bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#e8d08a]">
                {Math.floor(currentTime / 60)}:
                {String(Math.floor(currentTime % 60)).padStart(2, '0')}
              </span>
              <input
                type="range"
                min="0"
                max={totalDuration}
                step="0.05"
                value={currentTime}
                onChange={handleScrubberChange}
                className="flex-1 accent-[#c9a24b] h-1.5 bg-[#18080f] rounded cursor-pointer"
              />
              <span className="text-xs font-mono text-[#fbf3dc]/70">
                {Math.floor(totalDuration / 60)}:
                {String(Math.floor(totalDuration % 60)).padStart(2, '0')}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="p-2 bg-[#240e17] hover:bg-[#6e1f34] text-[#e8d08a] border border-[#c9a24b]/40 rounded-lg cursor-pointer"
                  title={isPlaying ? 'रोकें (Pause)' : 'चलाएँ (Play)'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setCurrentTime(0);
                    if (!isMuted && isPlaying) weddingAudio.playPreview(0, totalDuration, project.audio.volume);
                  }}
                  className="p-2 bg-[#240e17] hover:bg-[#6e1f34] text-[#e8d08a] border border-[#c9a24b]/40 rounded-lg cursor-pointer"
                  title="पुनः प्रारंभ (Restart)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleMute}
                  className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                    isMuted
                      ? 'bg-red-950/40 text-red-300 border-red-500/30'
                      : 'bg-[#240e17] hover:bg-[#6e1f34] text-[#e8d08a] border-[#c9a24b]/40'
                  }`}
                  title={isMuted ? 'ध्वनि चालू करें' : 'म्यूट करें'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Loop Checkbox */}
              <label className="flex items-center gap-1.5 text-xs text-[#fbf3dc]/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLooping}
                  onChange={(e) => setIsLooping(e.target.checked)}
                  className="accent-[#c9a24b] rounded"
                />
                <span>लूप (Loop)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Export Settings & Action */}
        <div className="lg:col-span-6 space-y-6">
          {/* Quick Scene Jump Strip */}
          <div className="bg-[#240e17] border border-[#c9a24b]/30 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold font-serif text-[#e8d08a] uppercase tracking-wide">
              दृश्य चयन (Jump to Scene)
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {project.scenes.map((sc, i) => (
                <button
                  key={sc.id}
                  onClick={() => setCurrentTime(sc.start)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    currentTime >= sc.start && currentTime < sc.start + sc.duration
                      ? 'bg-[#6e1f34] text-[#e8d08a] border border-[#c9a24b]'
                      : 'bg-[#18080f] text-[#fbf3dc]/70 hover:text-[#fbf3dc] border border-[#c9a24b]/20'
                  }`}
                >
                  {i + 1}. {sc.titleHi}
                </button>
              ))}
            </div>
          </div>

          {/* Export Settings Card */}
          <div className="bg-[#240e17] border border-[#c9a24b]/40 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#c9a24b]/30 pb-3">
              <h3 className="text-lg font-bold font-serif text-[#e8d08a] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#c9a24b]" />
                <span>वीडियो निर्यात सेटिंग्स (Export Presets)</span>
              </h3>
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                WebCodecs + MP4 Muxer
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Resolution */}
              <div>
                <label className="block text-xs text-[#fbf3dc]/80 font-medium mb-1">
                  रिज़ॉल्यूशन (Resolution)
                </label>
                <select
                  value={project.export.resolution}
                  onChange={(e) =>
                    onChange({
                      ...project,
                      export: {
                        ...project.export,
                        resolution: e.target.value as any,
                      },
                    })
                  }
                  className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg px-3 py-2 text-xs text-[#fbf3dc]"
                >
                  <option value="1080x1920">1080x1920 (9:16 Full HD - डिफ़ॉल्ट रील्स/स्टेटस)</option>
                  <option value="720x1280">720x1280 (9:16 HD - तीव्र निर्यात)</option>
                  <option value="1080x1080">1080x1080 (1:1 चौकोर फ़ीड)</option>
                </select>
              </div>

              {/* Preset (WhatsApp vs High Quality) */}
              <div>
                <label className="block text-xs text-[#fbf3dc]/80 font-medium mb-1">
                  गुणवत्ता प्रोफाइल (Quality Preset)
                </label>
                <select
                  value={project.export.preset}
                  onChange={(e) =>
                    onChange({
                      ...project,
                      export: {
                        ...project.export,
                        preset: e.target.value as any,
                      },
                    })
                  }
                  className="w-full bg-[#18080f] border border-[#c9a24b]/40 rounded-lg px-3 py-2 text-xs text-[#fbf3dc]"
                >
                  <option value="standard">मानक उच्च गुणवत्ता (8 Mbps H.264)</option>
                  <option value="whatsapp">व्हाट्सएप अनुकूल (&lt; 15 MB WhatsApp Safe)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs text-[#fbf3dc]/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={project.export.includeAudio}
                  onChange={(e) =>
                    onChange({
                      ...project,
                      export: {
                        ...project.export,
                        includeAudio: e.target.checked,
                      },
                    })
                  }
                  className="accent-[#c9a24b] rounded"
                />
                <span>शहनाई व मांगलिक ध्वनि संगीत शामिल करें (Include Audio Soundscape)</span>
              </label>
            </div>

            {/* Primary Export Button */}
            <div className="pt-4 border-t border-[#c9a24b]/30">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-3.5 bg-gradient-to-r from-[#852740] via-[#6e1f34] to-[#4a1224] hover:from-[#9c2e4b] hover:to-[#5e172e] text-[#fbf3dc] border-2 border-[#c9a24b] rounded-xl font-bold font-serif text-base flex items-center justify-center gap-2.5 shadow-xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <Download className="w-5 h-5 text-[#e8d08a]" />
                <span>1080x1920 MP4 वीडियो डाउनलोड करें (Export Video)</span>
              </button>
            </div>

            {/* Share / Poster Download Strip if exported */}
            {downloadUrls && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between">
                <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  MP4 वीडियो तैयार एवं डाउनलोड हो चुका है!
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={downloadUrls.posterUrl}
                    download="Wedding_Poster_Frame.png"
                    className="px-2.5 py-1 bg-[#240e17] text-xs text-[#e8d08a] border border-[#c9a24b]/40 rounded hover:bg-[#3d1324]"
                  >
                    पोस्टर (PNG)
                  </a>
                  {'share' in navigator && (
                    <button
                      onClick={handleShare}
                      className="px-2.5 py-1 bg-[#6e1f34] text-xs text-[#e8d08a] border border-[#c9a24b] rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      शेयर करें
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Progress Modal */}
      {isExporting && exportProgress && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#240e17] border-2 border-[#c9a24b] rounded-2xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl">
            <h3 className="text-xl font-bold font-serif text-[#e8d08a]">
              वीडियो तैयार हो रहा है...
            </h3>
            <p className="text-xs text-[#fbf3dc]/70">
              प्रत्येक फ्रेम का उच्च गुणवत्ता (1080x1920) रेंडरिंग एवं MP4 एनकोडिंग किया जा रहा है।
            </p>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-[#14060c] rounded-full overflow-hidden border border-[#c9a24b]/40">
                <div
                  className="h-full bg-gradient-to-r from-[#c9a24b] to-[#ffd700] transition-all duration-150"
                  style={{ width: `${exportProgress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-[#e8d08a]">
                <span>{exportProgress.percent}% पूर्ण</span>
                <span>
                  फ्रेम: {exportProgress.currentFrame} / {exportProgress.totalFrames}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#fbf3dc]/60">
              {exportProgress.statusText} • शेष समय: ~{exportProgress.etaSeconds}s
            </p>

            <button
              onClick={cancelExport}
              className="px-4 py-2 bg-transparent hover:bg-white/5 text-red-300 text-xs font-semibold rounded-lg border border-red-500/30 cursor-pointer"
            >
              रद्द करें (Cancel)
            </button>
          </div>
        </div>
      )}

      {/* Proof Sheet Modal */}
      <ProofSheetModal
        project={project}
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        onToggleApproval={toggleProofApproval}
        onApproveAll={approveAllProof}
      />
    </div>
  );
};
