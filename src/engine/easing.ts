/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

export function linear(t: number): number {
  return clamp(t);
}

export function easeInQuad(t: number): number {
  const c = clamp(t);
  return c * c;
}

export function easeOutQuad(t: number): number {
  const c = clamp(t);
  return c * (2 - c);
}

export function easeInOutCubic(t: number): number {
  const c = clamp(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/**
 * Entrance easing approximating cubic-bezier(0.22, 0.8, 0.2, 1) with subtle overshoot on settles
 */
export function easeEntranceOvershoot(t: number, overshoot = 0.04): number {
  const c = clamp(t);
  if (c >= 1) return 1;
  // Natural overshoot settle formula
  const p = 1 - Math.pow(1 - c, 3.2);
  const wave = Math.sin(c * Math.PI) * Math.pow(1 - c, 2);
  return clamp(p + wave * overshoot, 0, 1 + overshoot);
}

/**
 * Standard smooth camera push/pan easing
 */
export function smoothStep(t: number): number {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
}

/**
 * Calculates a progressive stagger index for word-by-word reveal (e.g. 60ms stagger)
 */
export function calculateStaggerProgress(
  elapsedSeconds: number,
  index: number,
  staggerIntervalSec = 0.06,
  itemDurationSec = 0.35
): number {
  const itemStart = index * staggerIntervalSec;
  if (elapsedSeconds < itemStart) return 0;
  const progress = (elapsedSeconds - itemStart) / itemDurationSec;
  return clamp(progress);
}
