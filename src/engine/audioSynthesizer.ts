/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class WeddingAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private customAudioBuffer: AudioBuffer | null = null;
  private customSourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private startTime = 0;
  private pauseOffset = 0;

  // Synthesis active nodes for live preview
  private synthInterval: number | null = null;

  async init(): Promise<void> {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  async loadCustomAudio(arrayBuffer: ArrayBuffer): Promise<void> {
    await this.init();
    if (!this.audioCtx) return;
    this.customAudioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
  }

  setVolume(volume: number): void {
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.audioCtx.currentTime);
    }
  }

  /**
   * Synthesizes wedding raga bells and chords at given time into any AudioContext (live or offline)
   */
  static synthesizeSoundscapeAtTime(
    ctx: BaseAudioContext,
    destination: AudioNode,
    t: number,
    totalDuration: number,
    volume = 0.8
  ): void {
    // 1. Tanpura Drone (Sa, Pa, Sa')
    const sa = 138.59; // C#3
    const pa = 207.65; // G#3
    const highSa = 277.18; // C#4

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.12 * volume, 0);

    // Fade in and out
    droneGain.gain.setValueAtTime(0, 0);
    droneGain.gain.linearRampToValueAtTime(0.15 * volume, 2.5);
    droneGain.gain.setValueAtTime(0.15 * volume, Math.max(0, totalDuration - 3));
    droneGain.gain.linearRampToValueAtTime(0, totalDuration);

    [sa, pa, highSa, sa * 0.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq + (i === 1 ? 0.3 : -0.2), 0);
      osc.connect(droneGain);
      osc.start(0);
      osc.stop(totalDuration);
    });
    droneGain.connect(destination);

    // 2. Temple Chimes & Ghanta every 4-5 seconds
    const chimeTimes = [0.8, 6.2, 11.5, 16.5, 21.2, 26.5, 38.2, 42.5, 60.2, 66.5];
    chimeTimes.forEach((chimeT) => {
      if (chimeT < totalDuration) {
        // Bell harmonics
        [880, 1760, 2640, 3520].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq * (1 + idx * 0.02), chimeT);

          const baseAmp = [0.08, 0.04, 0.02, 0.01][idx] * volume;
          g.gain.setValueAtTime(0, chimeT);
          g.gain.linearRampToValueAtTime(baseAmp, chimeT + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, chimeT + 2.5);

          osc.connect(g);
          g.connect(destination);
          osc.start(chimeT);
          osc.stop(chimeT + 2.8);
        });
      }
    });

    // 3. Auspicious Shehnai / Flute melodic arpeggios (Raag Yaman notes: Sa, Re, Ga, Ma', Pa, Dha, Ni, Sa')
    // Frequencies in C#
    const scale = [277.18, 311.13, 349.23, 392.0, 415.3, 466.16, 523.25, 554.37];
    const melodyPattern = [
      { t: 1.5, note: 0, dur: 0.8 },
      { t: 2.3, note: 2, dur: 0.9 },
      { t: 3.2, note: 4, dur: 1.2 },
      { t: 4.4, note: 7, dur: 1.5 },
      { t: 7.0, note: 4, dur: 0.7 },
      { t: 7.7, note: 5, dur: 0.7 },
      { t: 8.4, note: 7, dur: 1.8 },
      { t: 12.0, note: 2, dur: 0.8 },
      { t: 12.8, note: 4, dur: 0.9 },
      { t: 13.7, note: 7, dur: 1.6 },
      { t: 17.0, note: 0, dur: 0.9 },
      { t: 17.9, note: 2, dur: 0.9 },
      { t: 18.8, note: 4, dur: 1.2 },
      { t: 22.0, note: 4, dur: 0.7 },
      { t: 22.7, note: 5, dur: 0.8 },
      { t: 23.5, note: 7, dur: 1.5 },
      { t: 27.0, note: 0, dur: 1.0 },
      { t: 28.0, note: 2, dur: 0.8 },
      { t: 28.8, note: 4, dur: 1.2 },
      { t: 30.0, note: 7, dur: 2.0 },
      { t: 43.0, note: 2, dur: 0.9 },
      { t: 43.9, note: 4, dur: 0.9 },
      { t: 44.8, note: 7, dur: 1.4 },
      { t: 61.0, note: 4, dur: 0.8 },
      { t: 61.8, note: 2, dur: 0.8 },
      { t: 62.6, note: 0, dur: 1.5 },
      { t: 67.0, note: 0, dur: 0.8 },
      { t: 67.8, note: 2, dur: 0.8 },
      { t: 68.6, note: 4, dur: 1.0 },
      { t: 69.6, note: 7, dur: 2.5 },
    ];

    melodyPattern.forEach((item) => {
      if (item.t < totalDuration) {
        const freq = scale[item.note % scale.length];
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const noteGain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, item.t);

        // Vocalic / Shehnai reed filter
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 1.5, item.t);
        filter.Q.setValueAtTime(3.0, item.t);

        noteGain.gain.setValueAtTime(0, item.t);
        noteGain.gain.linearRampToValueAtTime(0.09 * volume, item.t + 0.1);
        noteGain.gain.setValueAtTime(0.09 * volume, item.t + item.dur * 0.7);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, item.t + item.dur);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(destination);

        osc.start(item.t);
        osc.stop(item.t + item.dur + 0.1);
      }
    });
  }

  /**
   * Renders the entire project audio into an offline AudioBuffer for MP4 export
   */
  static async renderOfflineAudio(
    totalDuration: number,
    volume = 0.85,
    customBuffer: AudioBuffer | null = null,
    sampleRate = 44100
  ): Promise<AudioBuffer> {
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

    if (customBuffer) {
      const src = offlineCtx.createBufferSource();
      src.buffer = customBuffer;
      const g = offlineCtx.createGain();
      g.gain.setValueAtTime(volume, 0);
      src.connect(g);
      g.connect(offlineCtx.destination);
      src.start(0);
    } else {
      WeddingAudioEngine.synthesizeSoundscapeAtTime(
        offlineCtx,
        offlineCtx.destination,
        0,
        totalDuration,
        volume
      );
    }

    return await offlineCtx.startRendering();
  }

  /**
   * Live preview audio controls
   */
  async playPreview(currentTimeSec: number, totalDuration: number, volume = 0.85): Promise<void> {
    await this.init();
    if (!this.audioCtx) return;

    this.stopPreview();
    this.isPlaying = true;
    this.startTime = this.audioCtx.currentTime - currentTimeSec;

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    this.gainNode.connect(this.audioCtx.destination);

    if (this.customAudioBuffer) {
      this.customSourceNode = this.audioCtx.createBufferSource();
      this.customSourceNode.buffer = this.customAudioBuffer;
      this.customSourceNode.connect(this.gainNode);
      this.customSourceNode.start(0, currentTimeSec % this.customAudioBuffer.duration);
    } else {
      // Synthesize live
      const remainingTime = Math.max(0.1, totalDuration - currentTimeSec);
      WeddingAudioEngine.synthesizeSoundscapeAtTime(
        this.audioCtx,
        this.gainNode,
        0,
        remainingTime,
        volume
      );
    }
  }

  stopPreview(): void {
    this.isPlaying = false;
    if (this.customSourceNode) {
      try {
        this.customSourceNode.stop();
      } catch (_) {}
      this.customSourceNode = null;
    }
    if (this.audioCtx && this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (_) {}
      this.gainNode = null;
    }
  }
}

export const weddingAudio = new WeddingAudioEngine();
