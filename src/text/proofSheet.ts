/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project } from '../data/schema.ts';

export interface ProofItem {
  id: string;
  category: string;
  categoryHi: string;
  sceneId: string;
  timeRange: string;
  originalText: string;
  cleanText: string;
  glyphCount: number;
  hasConjuncts: boolean;
  status: 'verified' | 'unverified';
}

/**
 * Normalizes text to Unicode NFC and cleans redundant whitespace.
 */
export function normalizeHindiText(text: string): string {
  if (!text) return '';
  return text.normalize('NFC').trim();
}

/**
 * Checks if Devanagari text contains conjuncts (halant / virama) or special matras
 */
export function containsDevanagariConjuncts(text: string): boolean {
  // \u094D is Devanagari Virama (halant) which binds conjuncts (e.g. क्ष, त्र, ज्ञ, श्र)
  // \u0943-\u0944 is Vocalic R (e.g. घृत, कृपा)
  // \u0902 is Anusvara, \u0903 is Visarga
  return /[\u094D\u0902\u0903\u0943-\u094F]/.test(text);
}

/**
 * Calculates WhatsApp target bitrate in Kbps so total file <= targetMB (default 15MB)
 */
export function calculateWhatsAppBitrateKbps(durationSec: number, targetMB = 15, audioKbps = 128): number {
  if (durationSec <= 0) return 2000;
  const totalBits = targetMB * 8 * 1024 * 1024;
  const totalKbps = totalBits / (durationSec * 1024);
  const videoKbps = Math.max(500, Math.floor(totalKbps - audioKbps));
  return videoKbps;
}

/**
 * Extracts all strings that will appear in the invitation video.
 */
export function extractProofItems(project: Project): ProofItem[] {
  const items: ProofItem[] = [];

  const add = (
    id: string,
    category: string,
    categoryHi: string,
    sceneId: string,
    timeRange: string,
    text: string
  ) => {
    const clean = normalizeHindiText(text);
    if (!clean) return;
    items.push({
      id,
      category,
      categoryHi,
      sceneId,
      timeRange,
      originalText: text,
      cleanText: clean,
      glyphCount: Array.from(clean).length,
      hasConjuncts: containsDevanagariConjuncts(clean),
      status: project.proofApprovals[id] ? 'verified' : 'unverified',
    });
  };

  // Welcome scene
  add('ganesh', 'Invocation', 'श्री गणेश वंदना', 'welcome', '0:00 - 0:06', project.copy.ganesh);
  add('welcome1', 'Welcome Line 1', 'स्वागत पंक्ति १', 'welcome', '0:00 - 0:06', project.copy.welcome1);
  add('welcome2', 'Welcome Line 2', 'स्वागत पंक्ति २', 'welcome', '0:00 - 0:06', project.copy.welcome2);

  // Envelope Gate
  add(
    'envelopeGuest',
    'Guest Salutation',
    'अतिथि सम्मान',
    'envelopeGate',
    '0:06 - 0:11',
    `${project.guest.salutation || 'सेवा में,'} ${project.guest.name}`
  );

  // Card 1
  add('groom', 'Groom Name', 'वर का नाम', 'cardReveal', '0:26 - 0:38', `${project.families.groom.honorific} ${project.couple.groom}`);
  add('groomFamily', 'Groom Family Lines', 'वर पक्ष परिचय', 'cardReveal', '0:26 - 0:38', project.families.groom.lines.join(' | '));
  add('bride', 'Bride Name', 'वधू का नाम', 'cardReveal', '0:26 - 0:38', `${project.families.bride.honorific} ${project.couple.bride}`);
  add('brideFamily', 'Bride Family Lines', 'वधू पक्ष परिचय', 'cardReveal', '0:26 - 0:38', project.families.bride.lines.join(' | '));
  add('title', 'Ceremony Title', 'उत्सव शीर्षक', 'cardReveal', '0:26 - 0:38', project.copy.title);
  add('invitation', 'Invitation Body', 'आमंत्रण संदेश', 'cardReveal', '0:26 - 0:38', project.copy.invitation);
  add('seen', 'Darshanabhilashi', 'दर्शनाभिलाषी', 'cardReveal', '0:26 - 0:38', project.copy.seen);
  add('wellwishers', 'Aakankshi', 'आकांक्षी', 'cardReveal', '0:26 - 0:38', project.copy.wellwishers);

  // Card 2 Events
  project.events.forEach((ev, idx) => {
    const venueStr = ev.venue ? ` | स्थान: ${ev.venue}` : ` | ${project.copy.toBeInformedText}`;
    const timeStr = ev.time ? ` | समय: ${ev.time}` : '';
    add(
      `event_${ev.id}`,
      `Ceremony ${idx + 1}`,
      `मांगलिक कार्यक्रम ${idx + 1}`,
      'eventHighlight',
      '0:42 - 1:00',
      `${ev.day}, ${ev.date} : ${ev.title}${timeStr}${venueStr}`
    );
  });

  // Finale
  add('closing', 'Blessing Line', 'समापन वंदना', 'blessingFinale', '1:06 - 1:15', project.copy.closing);
  add('coupleShort', 'Couple Slogan', 'युगल नाम', 'blessingFinale', '1:06 - 1:15', `${project.couple.groomShort} संग ${project.couple.brideShort}`);

  return items;
}
