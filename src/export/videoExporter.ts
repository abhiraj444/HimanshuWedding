/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { zipSync } from 'fflate';
import { Project, ExportSettings } from '../data/schema.ts';
import { renderFrame, getTotalDuration, RenderContext } from '../engine/renderFrame.ts';
import { WeddingAudioEngine } from '../engine/audioSynthesizer.ts';
import { calculateWhatsAppBitrateKbps } from '../text/proofSheet.ts';

export interface ExportProgress {
  progress: number; // 0 to 1
  percent: number; // 0 to 100
  currentFrame: number;
  totalFrames: number;
  etaSeconds: number;
  statusText: string;
}

export class VideoExporter {
  private isCancelled = false;

  cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Main export method: renders frame-by-frame and muxes to MP4 blob
   */
  async exportProjectMP4(
    project: Project,
    settings: ExportSettings,
    onProgress?: (p: ExportProgress) => void
  ): Promise<{ mp4Blob: Blob; posterBlob: Blob }> {
    this.isCancelled = false;

    const totalDuration = getTotalDuration(project.scenes);
    const fps = settings.fps || 30;
    const totalFrames = Math.ceil(totalDuration * fps);

    // Parse resolution
    const [resW, resH] = settings.resolution.split('x').map(Number);
    const width = resW || 1080;
    const height = resH || 1920;

    // Calculate bitrate
    let videoBitrate = settings.bitrateKbps * 1000;
    if (settings.preset === 'whatsapp') {
      const whatsappKbps = calculateWhatsAppBitrateKbps(totalDuration, 15, 128);
      videoBitrate = whatsappKbps * 1000;
    }

    // Render Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not create 2D canvas context for export');

    const renderCtx: RenderContext = {
      canvas,
      ctx,
      width,
      height,
      scale: width / 1080,
    };

    // 1. Generate Poster frame at t=6.5s (Envelope with couple & guest)
    renderFrame(project, 6.5, renderCtx);
    const posterBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
    });

    // Check if WebCodecs is supported
    const hasWebCodecs = typeof (window as any).VideoEncoder !== 'undefined';

    if (!hasWebCodecs) {
      // Fallback: Realtime MediaRecorder
      return this.exportWithMediaRecorder(project, settings, canvas, renderCtx, totalDuration, posterBlob, onProgress);
    }

    // WebCodecs + mp4-muxer pipeline
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: {
        codec: 'avc',
        width,
        height,
      },
      audio: settings.includeAudio
        ? {
            codec: 'aac',
            numberOfChannels: 2,
            sampleRate: 44100,
          }
        : undefined,
      fastStart: 'in-memory',
    });

    // Initialize VideoEncoder
    let videoEncoderError: Error | null = null;
    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        muxer.addVideoChunk(chunk, meta);
      },
      error: (e) => {
        videoEncoderError = e;
        console.error('VideoEncoder error:', e);
      },
    });

    videoEncoder.configure({
      codec: 'avc1.640028', // H.264 High Profile Level 4.0
      width,
      height,
      bitrate: videoBitrate,
      framerate: fps,
    });

    // Render & Encode Audio if enabled
    if (settings.includeAudio) {
      try {
        onProgress?.({
          progress: 0.05,
          percent: 5,
          currentFrame: 0,
          totalFrames,
          etaSeconds: 0,
          statusText: 'मांगलिक संगीत तैयार हो रहा है (Synthesizing Audio)...',
        });

        const audioBuffer = await WeddingAudioEngine.renderOfflineAudio(totalDuration, project.audio.volume);
        const audioEncoder = new AudioEncoder({
          output: (chunk, meta) => {
            muxer.addAudioChunk(chunk, meta);
          },
          error: (e) => console.error('AudioEncoder error:', e),
        });

        audioEncoder.configure({
          codec: 'mp4a.40.2', // AAC LC
          numberOfChannels: 2,
          sampleRate: 44100,
          bitrate: 128000,
        });

        // Convert audioBuffer to AudioData chunks
        const channel0 = audioBuffer.getChannelData(0);
        const channel1 = audioBuffer.getChannelData(1);
        const interleaved = new Float32Array(channel0.length * 2);
        for (let i = 0; i < channel0.length; i++) {
          interleaved[i * 2] = channel0[i];
          interleaved[i * 2 + 1] = channel1[i];
        }

        const audioData = new (window as any).AudioData({
          format: 'f32',
          sampleRate: 44100,
          numberOfFrames: channel0.length,
          numberOfChannels: 2,
          timestamp: 0,
          data: interleaved,
        });

        audioEncoder.encode(audioData);
        audioData.close();
        await audioEncoder.flush();
        audioEncoder.close();
      } catch (err) {
        console.warn('Audio export fallback skipped:', err);
      }
    }

    // Frame-by-frame Video Encoding loop
    const startTime = performance.now();

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (this.isCancelled) {
        videoEncoder.close();
        throw new Error('Export cancelled by user');
      }

      if (videoEncoderError) throw videoEncoderError;

      const frameT = frameIdx / fps;
      renderFrame(project, frameT, renderCtx);

      const timestampMicros = Math.round((frameIdx / fps) * 1_000_000);
      const videoFrame = new VideoFrame(canvas, {
        timestamp: timestampMicros,
        duration: Math.round((1 / fps) * 1_000_000),
      });

      const isKeyFrame = frameIdx % (fps * 2) === 0; // Keyframe every 2s
      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();

      // Backpressure: wait if queue builds up
      if (videoEncoder.encodeQueueSize > 6) {
        await new Promise((r) => setTimeout(r, 2));
      }

      // Progress reporting
      if (frameIdx % 5 === 0 || frameIdx === totalFrames - 1) {
        const elapsedSec = (performance.now() - startTime) / 1000;
        const framesPerSec = (frameIdx + 1) / Math.max(0.1, elapsedSec);
        const remainingFrames = totalFrames - (frameIdx + 1);
        const eta = Math.ceil(remainingFrames / Math.max(1, framesPerSec));

        const progressRatio = (frameIdx + 1) / totalFrames;
        onProgress?.({
          progress: progressRatio,
          percent: Math.round(progressRatio * 100),
          currentFrame: frameIdx + 1,
          totalFrames,
          etaSeconds: eta,
          statusText: `फिल्म निर्माण चल रहा है: ${Math.round(progressRatio * 100)}% (${frameIdx + 1}/${totalFrames})`,
        });
      }
    }

    await videoEncoder.flush();
    videoEncoder.close();
    muxer.finalize();

    const mp4Blob = new Blob([target.buffer], { type: 'video/mp4' });
    return { mp4Blob, posterBlob };
  }

  /**
   * MediaRecorder fallback for browsers without WebCodecs
   */
  private async exportWithMediaRecorder(
    project: Project,
    settings: ExportSettings,
    canvas: HTMLCanvasElement,
    renderCtx: RenderContext,
    totalDuration: number,
    posterBlob: Blob,
    onProgress?: (p: ExportProgress) => void
  ): Promise<{ mp4Blob: Blob; posterBlob: Blob }> {
    const stream = canvas.captureStream(settings.fps);
    const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
      ? 'video/mp4;codecs=avc1'
      : 'video/webm;codecs=vp9';

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: settings.bitrateKbps * 1000 });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.start(100);

    const fps = settings.fps;
    const totalFrames = Math.ceil(totalDuration * fps);
    const intervalMs = 1000 / fps;

    for (let i = 0; i < totalFrames; i++) {
      if (this.isCancelled) {
        recorder.stop();
        throw new Error('Export cancelled');
      }
      renderFrame(project, i / fps, renderCtx);
      onProgress?.({
        progress: i / totalFrames,
        percent: Math.round((i / totalFrames) * 100),
        currentFrame: i,
        totalFrames,
        etaSeconds: Math.ceil(((totalFrames - i) * intervalMs) / 1000),
        statusText: `MediaRecorder रिकॉर्डिंग: ${Math.round((i / totalFrames) * 100)}%`,
      });
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    const recordedBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: mimeType }));
      };
      recorder.stop();
    });

    return { mp4Blob: recordedBlob, posterBlob };
  }

  /**
   * Batch Guest Exports: renders a video for each guest and packages them in a single .ZIP!
   */
  async exportGuestBatchZip(
    baseProject: Project,
    settings: ExportSettings,
    onProgress?: (batchStatus: { currentGuest: string; guestIdx: number; totalGuests: number; percent: number }) => void
  ): Promise<Blob> {
    const zipEntries: Record<string, Uint8Array> = {};
    const guests = baseProject.guestList.length > 0 ? baseProject.guestList : [baseProject.guest];

    for (let i = 0; i < guests.length; i++) {
      if (this.isCancelled) throw new Error('Batch export cancelled');
      const g = guests[i];
      const guestProject: Project = {
        ...baseProject,
        guest: g,
      };

      onProgress?.({
        currentGuest: g.name,
        guestIdx: i + 1,
        totalGuests: guests.length,
        percent: Math.round((i / guests.length) * 100),
      });

      const { mp4Blob } = await this.exportProjectMP4(guestProject, settings);
      const arrayBuffer = await mp4Blob.arrayBuffer();
      const safeName = g.name.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '_');
      zipEntries[`Invitation_${i + 1}_${safeName}.mp4`] = new Uint8Array(arrayBuffer);
    }

    const zipped = zipSync(zipEntries);
    return new Blob([zipped], { type: 'application/zip' });
  }
}

export const videoExporter = new VideoExporter();
