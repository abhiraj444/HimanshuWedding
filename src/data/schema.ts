/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LocaleType = 'hi' | 'en';

export interface CoupleInfo {
  groom: string;
  bride: string;
  groomShort: string;
  brideShort: string;
}

export interface FamilyInfo {
  honorific: string;
  lines: string[];
}

export interface EventItem {
  id: string;
  date: string; // YYYY-MM-DD
  day: string;
  title: string;
  time: string | null; // e.g. "19:00" or null
  venue: string | null;
  from?: string;
  note?: string;
  icon: 'mehendi' | 'haldi' | 'baraat' | 'reception' | 'custom';
  highlight: boolean;
}

export interface Hotspot {
  id: string;
  label: string;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  width: number; // 0-1
  height: number; // 0-1
}

export interface CardDisplayConfig {
  mode: 'photo' | 'typeset';
  paperColor: string;
  textColor: string;
  accentColor: string;
  hotspots?: Hotspot[];
}

export type SceneId =
  | 'welcome'
  | 'envelopeGate'
  | 'envelopeOpen'
  | 'folderRise'
  | 'folderDoors'
  | 'cardReveal'
  | 'cardSwap'
  | 'eventHighlight'
  | 'foldAndPack'
  | 'blessingFinale';

export interface SceneConfig {
  id: SceneId;
  title: string;
  titleHi: string;
  start: number; // in seconds
  duration: number; // in seconds
  enabled: boolean;
  params: Record<string, any>;
}

export interface GuestItem {
  id: string;
  name: string;
  salutation?: string; // e.g. 'श्री', 'श्रीमती एवं श्री', 'आदरणीय'
  family?: boolean;
}

export type AssetSlotId =
  | 'envelopeFront'
  | 'envelopeBack'
  | 'envelopeFlap'
  | 'folderCover'
  | 'folderInside'
  | 'card1'
  | 'card2'
  | 'groomFigure'
  | 'brideFigure'
  | 'musicTrack';

export interface AssetRef {
  slotId: AssetSlotId;
  name: string;
  url: string; // URL or data URL
  originalUrl?: string;
  isCustomUpload?: boolean;
  width?: number;
  height?: number;
}

export interface ThemeConfig {
  palette: {
    primary: string; // maroon #6E1F34
    secondary: string; // deep maroon #4A1224
    gold: string; // gold #C9A24B
    lightGold: string; // #E8D08A
    cream: string; // #FBF3DC
    blush: string; // #F4E1E0
    green: string; // #DDE8CF
  };
  fontDevanagari: string;
  fontEnglish: string;
  motionIntensity: number; // 0.5 to 1.5
  enablePetals: boolean;
  enableGoldShimmer: boolean;
}

export interface ExportSettings {
  resolution: '1080x1920' | '720x1280' | '1080x1080' | '1920x1080';
  fps: number;
  format: 'mp4' | 'webm';
  preset: 'standard' | 'high' | 'whatsapp';
  bitrateKbps: number;
  includeAudio: boolean;
}

export interface Project {
  version: number;
  name: string;
  locale: LocaleType;
  couple: CoupleInfo;
  families: {
    groom: FamilyInfo;
    bride: FamilyInfo;
  };
  events: EventItem[];
  copy: {
    ganesh: string;
    shloka1: string;
    shloka2: string;
    welcome1: string;
    welcome2: string;
    title: string;
    invitation: string;
    seen: string;
    wellwishers: string;
    closing: string;
    couplet: string;
    senderNote?: string;
    toBeInformedText: string;
  };
  guest: GuestItem;
  guestList: GuestItem[];
  theme: ThemeConfig;
  cards: {
    card1: CardDisplayConfig;
    card2: CardDisplayConfig;
  };
  assets: Record<AssetSlotId, AssetRef | null>;
  scenes: SceneConfig[];
  audio: {
    musicType: 'procedural' | 'custom' | 'none';
    musicId?: string;
    volume: number;
    fadeIn: number;
    fadeOut: number;
    soundEffects: boolean;
  };
  export: ExportSettings;
  proofApprovals: Record<string, boolean>; // stringKey -> isApproved
}
