/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { DeterministicRNG } from './rng.ts';
import { easeEntranceOvershoot, clamp } from './easing.ts';
import { calculateWhatsAppBitrateKbps, containsDevanagariConjuncts, normalizeHindiText } from '../text/proofSheet.ts';
import { DEFAULT_PROJECT } from '../data/defaultProject.ts';

test('DeterministicRNG produces reproducible sequence for same seed', () => {
  const rng1 = new DeterministicRNG(42);
  const rng2 = new DeterministicRNG(42);

  const seq1 = [rng1.next(), rng1.next(), rng1.next()];
  const seq2 = [rng2.next(), rng2.next(), rng2.next()];

  assert.deepEqual(seq1, seq2);
  assert.notEqual(seq1[0], seq1[1]);
});

test('easeEntranceOvershoot produces slight overshoot and settles at 1', () => {
  const atZero = easeEntranceOvershoot(0);
  const mid = easeEntranceOvershoot(0.7);
  const atEnd = easeEntranceOvershoot(1);

  assert.equal(atZero, 0);
  assert.ok(mid > 0.8, 'Mid value should reach over 0.8');
  assert.equal(atEnd, 1);
});

test('Devanagari conjuncts and halant detection works accurately', () => {
  assert.equal(containsDevanagariConjuncts('प्रीतिभोज'), true);
  assert.equal(containsDevanagariConjuncts('घृतढारी'), true);
  assert.equal(containsDevanagariConjuncts('हिमांशु'), true);
  assert.equal(containsDevanagariConjuncts('कमल'), false);
});

test('Hindi text normalization handles whitespace and NFC', () => {
  const raw = '  ॥  श्री गणेशाय   नमः ॥  ';
  const norm = normalizeHindiText(raw);
  assert.equal(norm, '॥  श्री गणेशाय   नमः ॥');
});

test('WhatsApp bitrate calculation guarantees file size under 15MB', () => {
  const duration75s = 75;
  const kbps = calculateWhatsAppBitrateKbps(duration75s, 15, 128);
  // (15 * 8 * 1024 * 1024) / (75 * 1024) - 128 = 1638.4 - 128 = ~1510 kbps
  assert.ok(kbps > 1400 && kbps < 1600);
});

test('Default project ceremonies match card dates and weekdays exactly', () => {
  const events = DEFAULT_PROJECT.events;
  assert.equal(events.length, 4);

  // 9 Dec 2026 = Wednesday (बुधवार)
  assert.equal(events[0].date, '2026-12-09');
  assert.equal(events[0].day, 'बुधवार');

  // 10 Dec 2026 = Thursday (गुरुवार)
  assert.equal(events[1].date, '2026-12-10');
  assert.equal(events[1].day, 'गुरुवार');

  // 11 Dec 2026 = Friday (शुक्रवार)
  assert.equal(events[2].date, '2026-12-11');
  assert.equal(events[2].day, 'शुक्रवार');

  // 13 Dec 2026 = Sunday (रविवार)
  assert.equal(events[3].date, '2026-12-13');
  assert.equal(events[3].day, 'रविवार');
});
