/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ColorAdjustment {
  brightness: number; // -50 to 50
  contrast: number; // -50 to 50
  warmth: number; // -50 to 50
  saturation: number; // -50 to 50
}

/**
 * Checks if image resolution meets production standard (>= 1000px on long edge)
 */
export function checkImageQuality(img: HTMLImageElement): { isLowRes: boolean; width: number; height: number; message?: string } {
  const longSide = Math.max(img.naturalWidth, img.naturalHeight);
  if (longSide < 1000) {
    return {
      isLowRes: true,
      width: img.naturalWidth,
      height: img.naturalHeight,
      message: `Image resolution (${img.naturalWidth}x${img.naturalHeight}) is below recommended 1000px. High-res card photos produce crisp video exports.`,
    };
  }
  return {
    isLowRes: false,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}

/**
 * Applies color adjustments (brightness, contrast, warmth, saturation) to a canvas image
 */
export function applyColorAdjustments(
  sourceCanvas: HTMLCanvasElement,
  adj: ColorAdjustment
): HTMLCanvasElement {
  const outCanvas = document.createElement('canvas');
  outCanvas.width = sourceCanvas.width;
  outCanvas.height = sourceCanvas.height;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height);
  const d = imgData.data;

  // Pre-calculate factor
  const contrastFactor = (259 * (adj.contrast + 255)) / (255 * (259 - adj.contrast));

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];

    // Brightness
    r += adj.brightness;
    g += adj.brightness;
    b += adj.brightness;

    // Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // Warmth (boost red/yellow, reduce blue)
    if (adj.warmth !== 0) {
      r += adj.warmth * 0.8;
      g += adj.warmth * 0.4;
      b -= adj.warmth * 0.6;
    }

    // Saturation
    if (adj.saturation !== 0) {
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      const satFactor = 1 + adj.saturation / 100;
      r = gray + satFactor * (r - gray);
      g = gray + satFactor * (g - gray);
      b = gray + satFactor * (b - gray);
    }

    d[i] = Math.max(0, Math.min(255, r));
    d[i + 1] = Math.max(0, Math.min(255, g));
    d[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imgData, 0, 0);
  return outCanvas;
}

/**
 * Erase / Patch brush: paints a sampled background color or feather-erases over sensitive areas
 * (e.g. erasing the printed phone number on the envelope or blank lines).
 */
export function applyErasePatch(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor?: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, width, height);
  } else {
    // Sample ambient color around top/bottom border of patch
    const ambient = ctx.getImageData(Math.max(0, x), Math.max(0, y - 5), 1, 1).data;
    ctx.fillStyle = `rgb(${ambient[0]}, ${ambient[1]}, ${ambient[2]})`;
    ctx.fillRect(x, y, width, height);
  }
  ctx.restore();
}
