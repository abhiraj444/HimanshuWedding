/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, SceneConfig } from '../data/schema.ts';
import { DeterministicRNG } from './rng.ts';
import {
  clamp,
  easeInOutCubic,
  easeEntranceOvershoot,
  easeOutQuad,
  smoothStep,
  calculateStaggerProgress,
} from './easing.ts';
import { imagePreloader } from '../assets/store.ts';

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number; // width / 1080
}

/**
 * Main frame rendering function: pure function of (project, t, ctx)
 */
export function renderFrame(project: Project, t: number, renderCtx: RenderContext): void {
  const { ctx, width, height, scale } = renderCtx;
  const currentT = Math.max(0, t);

  // Clear canvas
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Default royal background
  drawRoyalBackground(ctx, width, height, project);

  // Determine current scene from timeline
  const activeScene = getActiveScene(project.scenes, currentT);
  const sceneT = activeScene ? currentT - activeScene.start : 0;
  const sceneProgress = activeScene ? clamp(sceneT / activeScene.duration) : 0;

  // Render scene based on activeScene id
  if (activeScene && activeScene.enabled) {
    switch (activeScene.id) {
      case 'welcome':
        renderWelcomeScene(ctx, width, height, scale, project, sceneT, sceneProgress);
        break;
      case 'envelopeGate':
        renderEnvelopeGateScene(ctx, width, height, scale, project, sceneT, sceneProgress);
        break;
      case 'envelopeOpen':
        renderEnvelopeOpenScene(ctx, width, height, scale, project, sceneT, sceneProgress);
        break;
      case 'folderRise':
        renderFolderRiseScene(ctx, width, height, scale, project, sceneT, sceneProgress);
        break;
      case 'folderDoors':
        renderFolderDoorsScene(ctx, width, height, scale, project, sceneT, sceneProgress);
        break;
      case 'cardReveal':
        renderCardRevealScene(ctx, width, height, scale, project, sceneT, sceneProgress);
        break;
      case 'cardSwap':
        renderCardSwapScene(ctx, width, height, scale, project, sceneT, sceneProgress);
        break;
      case 'eventHighlight':
        renderEventHighlightScene(ctx, width, height, scale, project, sceneT, sceneProgress);
        break;
      case 'foldAndPack':
        renderFoldAndPackScene(ctx, width, height, scale, project, sceneT, sceneProgress);
        break;
      case 'blessingFinale':
        renderBlessingFinaleScene(ctx, width, height, scale, project, sceneT, sceneProgress);
        break;
      default:
        renderWelcomeScene(ctx, width, height, scale, project, sceneT, sceneProgress);
    }
  } else {
    renderWelcomeScene(ctx, width, height, scale, project, 0, 0);
  }

  // Draw overlay petals if enabled (deterministic seeded per frame)
  if (project.theme.enablePetals) {
    drawFloatingPetals(ctx, width, height, scale, currentT, 35);
  }

  // Draw royal decorative outer frame border
  drawRoyalBorder(ctx, width, height, scale, project);

  ctx.restore();
}

/**
 * Finds the currently active scene for time t
 */
export function getActiveScene(scenes: SceneConfig[], t: number): SceneConfig | null {
  for (const sc of scenes) {
    if (sc.enabled && t >= sc.start && t < sc.start + sc.duration) {
      return sc;
    }
  }
  // If past last scene, hold last enabled scene
  const enabledScenes = scenes.filter((s) => s.enabled);
  if (enabledScenes.length > 0 && t >= enabledScenes[enabledScenes.length - 1].start) {
    return enabledScenes[enabledScenes.length - 1];
  }
  return enabledScenes[0] || null;
}

/**
 * Returns total project duration in seconds
 */
export function getTotalDuration(scenes: SceneConfig[]): number {
  let maxEnd = 0;
  for (const sc of scenes) {
    if (sc.enabled) {
      maxEnd = Math.max(maxEnd, sc.start + sc.duration);
    }
  }
  return Math.max(1, maxEnd);
}

// ==========================================
// SCENE IMPLEMENTATIONS
// ==========================================

function renderWelcomeScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  project: Project,
  t: number,
  progress: number
) {
  const p = easeEntranceOvershoot(progress * 1.5);

  // Background warm glow
  const grad = ctx.createRadialGradient(w / 2, h * 0.45, 10 * s, w / 2, h * 0.45, w * 0.7);
  grad.addColorStop(0, 'rgba(232, 208, 138, 0.25)');
  grad.addColorStop(0.6, 'rgba(110, 31, 52, 0.85)');
  grad.addColorStop(1, 'rgba(74, 18, 36, 0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Golden Arch and Toran
  drawOrnateToran(ctx, w, h, s, project.theme.palette.gold, p);

  // Ganesh Emblem
  const ganeshY = h * 0.22 - (1 - p) * 40 * s;
  drawGaneshEmblem(ctx, w / 2, ganeshY, 70 * s, project.theme.palette.gold, p, t);

  // Shloka 1: ॥ श्री गणेशाय नमः ॥
  const textAlpha1 = clamp((t - 0.5) / 1.0);
  ctx.save();
  ctx.globalAlpha = textAlpha1;
  ctx.fillStyle = project.theme.palette.lightGold;
  ctx.font = `600 ${34 * s}px 'Noto Serif Devanagari', serif`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(201, 162, 75, 0.6)';
  ctx.shadowBlur = 12 * s;
  ctx.fillText(project.copy.ganesh, w / 2, h * 0.35);

  // Mangalam Shloka
  ctx.font = `400 ${22 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = project.theme.palette.cream;
  ctx.shadowBlur = 0;
  const shlokaLines = project.copy.shloka1.split('\n');
  shlokaLines.forEach((line, idx) => {
    ctx.fillText(line, w / 2, h * 0.42 + idx * 32 * s);
  });
  ctx.restore();

  // Welcome lines staggered
  const welcomeP1 = clamp((t - 2.0) / 1.2);
  if (welcomeP1 > 0) {
    ctx.save();
    ctx.globalAlpha = welcomeP1;
    ctx.font = `500 ${28 * s}px 'Noto Serif Devanagari', serif`;
    ctx.fillStyle = project.theme.palette.lightGold;
    ctx.textAlign = 'center';
    ctx.fillText(project.copy.welcome1, w / 2, h * 0.58);
    ctx.restore();
  }

  const welcomeP2 = clamp((t - 3.2) / 1.2);
  if (welcomeP2 > 0) {
    ctx.save();
    ctx.globalAlpha = welcomeP2;
    ctx.font = `600 ${36 * s}px 'Noto Serif Devanagari', serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(232, 208, 138, 0.8)';
    ctx.shadowBlur = 16 * s;
    ctx.fillText(project.copy.welcome2, w / 2, h * 0.65);
    ctx.restore();
  }

  // Animated Folded Hands (Namaste)
  const namasteP = clamp((t - 4.0) / 1.0);
  if (namasteP > 0) {
    drawNamasteIcon(ctx, w / 2, h * 0.77, 44 * s, project.theme.palette.gold, namasteP);
  }
}

function renderEnvelopeGateScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  project: Project,
  t: number,
  progress: number
) {
  const p = easeEntranceOvershoot(progress * 1.2);
  const envelopeUrl = project.assets.envelopeFront?.url;
  const envImg = envelopeUrl ? imagePreloader.getImage(envelopeUrl) : null;

  ctx.save();
  // 3D subtle perspective tilt
  const tiltY = Math.sin(t * 1.5) * 3 * (Math.PI / 180);
  const cardW = w * 0.86;
  const cardH = cardW * 0.68; // envelope aspect ratio
  const cardX = (w - cardW) / 2;
  const cardY = h * 0.5 - cardH / 2 + (1 - p) * 120 * s;

  ctx.translate(w / 2, cardY + cardH / 2);
  ctx.rotate(tiltY);
  ctx.translate(-w / 2, -(cardY + cardH / 2));

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 35 * s;
  ctx.shadowOffsetY = 20 * s;

  if (envImg) {
    ctx.drawImage(envImg, cardX, cardY, cardW, cardH);
  } else {
    // Elegant fallback envelope front
    drawFallbackEnvelope(ctx, cardX, cardY, cardW, cardH, s, project);
  }

  // Privacy patch: Paint over sender phone and address on the photo so it remains private!
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#faf4e8'; // cream envelope paper match
  ctx.fillRect(cardX + cardW * 0.05, cardY + cardH * 0.76, cardW * 0.42, cardH * 0.22);

  // Elegant privacy-safe sender text
  ctx.font = `500 ${14 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = '#541525';
  ctx.textAlign = 'left';
  ctx.fillText('प्रेषक:-', cardX + cardW * 0.07, cardY + cardH * 0.82);
  ctx.fillText('श्री राजीव कुमार (मन्टु जी)', cardX + cardW * 0.07, cardY + cardH * 0.88);
  ctx.fillText('एवं समस्त सिन्हा परिवार', cardX + cardW * 0.07, cardY + cardH * 0.94);
  ctx.restore();

  // "सेवा में" Pen Reveal: Write guest name with handwriting pen effect
  const penStart = 1.2;
  const penP = clamp((t - penStart) / 2.2);

  if (penP > 0) {
    const guestLineX = cardX + cardW * 0.53;
    const guestLineY = cardY + cardH * 0.46;

    // Blank out pre-printed line area on envelope image
    ctx.fillStyle = '#f8f1e5';
    ctx.fillRect(guestLineX - 10 * s, guestLineY - 25 * s, cardW * 0.44, 45 * s);

    ctx.save();
    ctx.beginPath();
    ctx.rect(guestLineX - 10 * s, guestLineY - 30 * s, cardW * 0.44 * penP, 60 * s);
    ctx.clip();

    ctx.font = `600 ${22 * s}px 'Kalam', 'Noto Serif Devanagari', cursive`;
    ctx.fillStyle = '#541525';
    ctx.textAlign = 'left';
    ctx.fillText(`${project.guest.salutation || 'सेवा में,'}`, guestLineX, guestLineY);

    ctx.font = `700 ${24 * s}px 'Kalam', 'Noto Serif Devanagari', cursive`;
    ctx.fillStyle = '#6e1f34';
    ctx.fillText(project.guest.name, guestLineX, guestLineY + 28 * s);
    ctx.restore();

    // Pen feather icon
    if (penP < 1.0) {
      const curX = guestLineX + cardW * 0.42 * penP;
      drawCalligraphyNib(ctx, curX, guestLineY + 15 * s, 18 * s);
    }
  }

  // Gold Shimmer Sweep across couple names and wedding date
  const sweepStart = 2.8;
  if (t > sweepStart) {
    const sweepProgress = (t - sweepStart) / 1.5;
    if (sweepProgress <= 1.0) {
      drawGoldShimmerSweep(ctx, cardX, cardY, cardW, cardH, sweepProgress);
    }
  }

  ctx.restore();
}

function renderEnvelopeOpenScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  project: Project,
  t: number,
  progress: number
) {
  const cardW = w * 0.86;
  const cardH = cardW * 0.68;
  const cardX = (w - cardW) / 2;
  const cardY = h * 0.5 - cardH / 2;

  // Envelope flip to back (first 1.5s)
  const flipP = clamp(t / 1.8);
  const rotateAngle = easeInOutCubic(flipP) * Math.PI;

  ctx.save();
  ctx.translate(w / 2, cardY + cardH / 2);
  ctx.scale(Math.cos(rotateAngle), 1);
  ctx.translate(-w / 2, -(cardY + cardH / 2));

  // Front or Back draw based on rotation
  if (rotateAngle < Math.PI / 2) {
    // Envelope Front
    const envUrl = project.assets.envelopeFront?.url;
    const img = envUrl ? imagePreloader.getImage(envUrl) : null;
    if (img) ctx.drawImage(img, cardX, cardY, cardW, cardH);
    else drawFallbackEnvelope(ctx, cardX, cardY, cardW, cardH, s, project);
  } else {
    // Envelope Back with triangular flap opening
    drawEnvelopeBackWithFlap(ctx, cardX, cardY, cardW, cardH, s, project, t - 1.8);
  }
  ctx.restore();
}

function drawEnvelopeBackWithFlap(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  s: number,
  project: Project,
  flapT: number
) {
  // Envelope body
  ctx.fillStyle = '#f5ede0';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 3 * s;
  ctx.strokeRect(x, y, w, h);

  // Inner warm glow opening out of the pocket
  const flapP = clamp(flapT / 2.5);
  const flapAngle = easeInOutCubic(flapP) * Math.PI; // 0 to 180 degrees upwards

  // Back folds
  ctx.fillStyle = '#eae0cf';
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w / 2, y + h * 0.52);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left flap fold
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w * 0.4, y + h * 0.52);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right flap fold
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w * 0.6, y + h * 0.52);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Golden glow coming from inside
  if (flapP > 0.1) {
    const glowGrad = ctx.createRadialGradient(x + w / 2, y + h * 0.3, 5 * s, x + w / 2, y + h * 0.3, w * 0.5);
    glowGrad.addColorStop(0, `rgba(232, 208, 138, ${0.8 * flapP})`);
    glowGrad.addColorStop(1, 'rgba(201, 162, 75, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(x, y - h * 0.2, w, h);
  }

  // Top Flap opening on 3D hinge
  ctx.save();
  ctx.translate(x + w / 2, y);
  ctx.scale(1, Math.cos(flapAngle)); // Flap lifting open

  ctx.fillStyle = flapAngle > Math.PI / 2 ? '#eedfcd' : '#faf3e7';
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(0, h * 0.58);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Royal Wax Seal on flap
  if (flapAngle < Math.PI / 2) {
    drawGoldWaxSeal(ctx, 0, h * 0.45, 30 * s);
  }
  ctx.restore();
}

function renderFolderRiseScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  project: Project,
  t: number,
  progress: number
) {
  const p = easeEntranceOvershoot(progress);

  // Background envelope dropping down and fading
  const envFade = clamp(1 - progress * 1.5);
  if (envFade > 0) {
    ctx.save();
    ctx.globalAlpha = envFade;
    const envY = h * 0.5 + progress * 200 * s;
    const cardW = w * 0.86;
    const cardH = cardW * 0.68;
    drawEnvelopeBackWithFlap(ctx, (w - cardW) / 2, envY, cardW, cardH, s, project, 3.0);
    ctx.restore();
  }

  // Royal Folder rising up
  const folderW = w * 0.84;
  const folderH = folderW * 1.35;
  const folderX = (w - folderW) / 2;
  const folderY = h * 0.5 - folderH / 2 + (1 - p) * (h * 0.6);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 30 * s;
  ctx.shadowOffsetY = 15 * s;

  const folderUrl = project.assets.folderCover?.url;
  const folderImg = folderUrl ? imagePreloader.getImage(folderUrl) : null;
  if (folderImg) {
    ctx.drawImage(folderImg, folderX, folderY, folderW, folderH);
  } else {
    // Fallback royal folder cover
    ctx.fillStyle = '#6e1f34';
    ctx.fillRect(folderX, folderY, folderW, folderH);
    ctx.strokeStyle = '#c9a24b';
    ctx.lineWidth = 4 * s;
    ctx.strokeRect(folderX, folderY, folderW, folderH);
  }

  // Golden title label
  ctx.font = `700 ${28 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = '#e8d08a';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 10 * s;
  ctx.fillText('॥ पावन परिणयोत्सव ॥', w / 2, folderY + 60 * s);
  ctx.restore();
}

function renderFolderDoorsScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  project: Project,
  t: number,
  progress: number
) {
  const folderW = w * 0.84;
  const folderH = folderW * 1.35;
  const folderX = (w - folderW) / 2;
  const folderY = h * 0.5 - folderH / 2;

  const openP = clamp(progress * 1.3);
  const doorAngle = easeInOutCubic(openP) * (115 * Math.PI / 180);

  // 1. Draw Interior Elephant Procession (Card WA0007)
  const insideUrl = project.assets.folderInside?.url;
  const insideImg = insideUrl ? imagePreloader.getImage(insideUrl) : null;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 30 * s;
  if (insideImg) {
    ctx.drawImage(insideImg, folderX, folderY, folderW, folderH);
  } else {
    ctx.fillStyle = '#f8f0de';
    ctx.fillRect(folderX, folderY, folderW, folderH);
  }
  ctx.restore();

  // 2. Left Door (Groom Portrait panel swinging open)
  const halfW = folderW / 2;
  const folderUrl = project.assets.folderCover?.url;
  const folderImg = folderUrl ? imagePreloader.getImage(folderUrl) : null;

  // Left door
  ctx.save();
  ctx.translate(folderX, folderY);
  ctx.scale(Math.cos(doorAngle), 1);
  if (folderImg) {
    ctx.drawImage(folderImg, 0, 0, folderImg.naturalWidth / 2, folderImg.naturalHeight, 0, 0, halfW, folderH);
  } else {
    ctx.fillStyle = '#6e1f34';
    ctx.fillRect(0, 0, halfW, folderH);
  }
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 3 * s;
  ctx.strokeRect(0, 0, halfW, folderH);
  ctx.restore();

  // Right door (Bride Portrait panel swinging open)
  ctx.save();
  ctx.translate(folderX + folderW, folderY);
  ctx.scale(Math.cos(doorAngle), 1);
  if (folderImg) {
    ctx.drawImage(
      folderImg,
      folderImg.naturalWidth / 2,
      0,
      folderImg.naturalWidth / 2,
      folderImg.naturalHeight,
      -halfW,
      0,
      halfW,
      folderH
    );
  } else {
    ctx.fillStyle = '#6e1f34';
    ctx.fillRect(-halfW, 0, halfW, folderH);
  }
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 3 * s;
  ctx.strokeRect(-halfW, 0, halfW, folderH);
  ctx.restore();

  // Sparkles burst on door opening
  if (openP > 0.4) {
    drawSparkleBurst(ctx, w / 2, h * 0.5, 60 * s, (openP - 0.4) / 0.6);
  }
}

function renderCardRevealScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  project: Project,
  t: number,
  progress: number
) {
  const cardW = w * 0.88;
  const cardH = cardW * 1.42;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2;

  const card1Config = project.cards.card1;
  const card1Url = project.assets.card1?.url;
  const card1Img = card1Url ? imagePreloader.getImage(card1Url) : null;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 30 * s;

  // Draw Card 1 (Photo mode or Typeset mode)
  if (card1Config.mode === 'photo' && card1Img) {
    ctx.drawImage(card1Img, cardX, cardY, cardW, cardH);
  } else {
    drawTypesetCard1(ctx, cardX, cardY, cardW, cardH, s, project);
  }
  ctx.restore();

  // Sequential Spotlights:
  // 0s-3s: Ganesh & Invocations
  // 3s-6s: Groom Side (Himanshu Raj)
  // 6s-9s: Bride Side (Kajal Kumari)
  // 9s-12s: Majestic Centered Couple Highlight & Title
  if (t < 3.0) {
    drawSpotlightBox(ctx, cardX + cardW * 0.2, cardY + cardH * 0.04, cardW * 0.6, cardH * 0.16, s, 'मंगलम् भगवान विष्णुः');
  } else if (t < 6.0) {
    drawSpotlightBox(
      ctx,
      cardX + cardW * 0.05,
      cardY + cardH * 0.2,
      cardW * 0.44,
      cardH * 0.24,
      s,
      `${project.families.groom.honorific} ${project.couple.groom}`
    );
  } else if (t < 9.0) {
    drawSpotlightBox(
      ctx,
      cardX + cardW * 0.51,
      cardY + cardH * 0.26,
      cardW * 0.44,
      cardH * 0.22,
      s,
      `${project.families.bride.honorific} ${project.couple.bride}`
    );
  } else {
    // 9s-12s: Grand Centered Names Banner
    const bannerP = clamp((t - 9.0) / 0.8);
    drawGrandCoupleBanner(ctx, w, h, s, project, bannerP);
  }
}

function renderCardSwapScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  project: Project,
  t: number,
  progress: number
) {
  const cardW = w * 0.88;
  const cardH = cardW * 1.42;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2;

  const card1Url = project.assets.card1?.url;
  const card2Url = project.assets.card2?.url;
  const img1 = card1Url ? imagePreloader.getImage(card1Url) : null;
  const img2 = card2Url ? imagePreloader.getImage(card2Url) : null;

  const swapP = easeInOutCubic(progress);

  // Card 2 underneath
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 20 * s;
  if (img2) {
    ctx.drawImage(img2, cardX, cardY, cardW, cardH);
  } else {
    drawTypesetCard2(ctx, cardX, cardY, cardW, cardH, s, project);
  }
  ctx.restore();

  // Card 1 sliding away with 3D curl/angle
  ctx.save();
  const slideX = cardX - swapP * (w * 1.2);
  const rotateZ = -swapP * 0.15;
  ctx.translate(slideX + cardW / 2, cardY + cardH / 2);
  ctx.rotate(rotateZ);
  ctx.translate(-(slideX + cardW / 2), -(cardY + cardH / 2));

  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 25 * s;
  if (img1) {
    ctx.drawImage(img1, slideX, cardY, cardW, cardH);
  } else {
    drawTypesetCard1(ctx, slideX, cardY, cardW, cardH, s, project);
  }
  ctx.restore();
}

function renderEventHighlightScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  project: Project,
  t: number,
  progress: number
) {
  const cardW = w * 0.88;
  const cardH = cardW * 1.42;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2;

  const card2Url = project.assets.card2?.url;
  const card2Img = card2Url ? imagePreloader.getImage(card2Url) : null;

  // Draw Card 2
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 25 * s;
  if (project.cards.card2.mode === 'photo' && card2Img) {
    ctx.drawImage(card2Img, cardX, cardY, cardW, cardH);
  } else {
    drawTypesetCard2(ctx, cardX, cardY, cardW, cardH, s, project);
  }

  // Soft dimming overlay for spotlight
  ctx.fillStyle = 'rgba(40, 10, 20, 0.45)';
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.restore();

  // 4 Events spotlight cycle: ~4.5s each
  const eventIdx = Math.min(3, Math.floor(t / 4.5));
  const ev = project.events[eventIdx] || project.events[0];
  const evProgress = (t % 4.5) / 4.5;

  // Event Box Position on Card 2
  const boxY = cardY + cardH * (0.24 + eventIdx * 0.14);
  const boxH = cardH * 0.12;

  // Clear spotlight hole over active event
  ctx.save();
  ctx.clearRect(cardX + cardW * 0.05, boxY, cardW * 0.9, boxH);
  if (project.cards.card2.mode === 'photo' && card2Img) {
    // Redraw sharp slice of card2
    const srcY = (card2Img.naturalHeight * (0.24 + eventIdx * 0.14));
    const srcH = card2Img.naturalHeight * 0.12;
    ctx.drawImage(
      card2Img,
      card2Img.naturalWidth * 0.05,
      srcY,
      card2Img.naturalWidth * 0.9,
      srcH,
      cardX + cardW * 0.05,
      boxY,
      cardW * 0.9,
      boxH
    );
  }

  // Golden glowing border around active event
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 3.5 * s;
  ctx.shadowColor = 'rgba(232, 208, 138, 0.9)';
  ctx.shadowBlur = 15 * s;
  ctx.strokeRect(cardX + cardW * 0.05, boxY, cardW * 0.9, boxH);
  ctx.restore();

  // Event 3 (Baraat & Vivah): Animated route from Maharani Colony to Dhanki Mod!
  if (eventIdx === 2) {
    drawBaraatRouteMap(ctx, cardX, cardY + cardH * 0.76, cardW, cardH * 0.22, s, evProgress);
  }

  // Event 4 (Reception): Venue spotlight pin at Patna City Club
  if (eventIdx === 3) {
    drawReceptionVenuePin(ctx, cardX, cardY + cardH * 0.74, cardW, cardH * 0.24, s, evProgress);
  }
}

function renderFoldAndPackScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  project: Project,
  t: number,
  progress: number
) {
  const p = easeInOutCubic(progress);
  const cardW = w * 0.86;
  const cardH = cardW * 0.68;
  const cardX = (w - cardW) / 2;
  const cardY = h * 0.5 - cardH / 2;

  // Folder closing and packing into envelope
  ctx.save();
  drawEnvelopeBackWithFlap(ctx, cardX, cardY, cardW, cardH, s, project, Math.max(0, 3.0 - p * 3.0));

  // Stamp royal gold seal when flap closes
  if (p > 0.75) {
    const sealScale = easeEntranceOvershoot((p - 0.75) / 0.25);
    drawGoldWaxSeal(ctx, cardX + cardW / 2, cardY + cardH * 0.45, 36 * s * sealScale);
  }
  ctx.restore();
}

function renderBlessingFinaleScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  project: Project,
  t: number,
  progress: number
) {
  // Deep royal celebratory background
  const grad = ctx.createRadialGradient(w / 2, h * 0.4, 20 * s, w / 2, h * 0.4, w * 0.8);
  grad.addColorStop(0, 'rgba(232, 208, 138, 0.35)');
  grad.addColorStop(0.5, 'rgba(110, 31, 52, 0.9)');
  grad.addColorStop(1, 'rgba(54, 12, 24, 0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Animated Royal Illustrated Figures (Groom and Bride)
  const figureP = clamp(t / 1.5);
  drawIllustratedRoyalCouple(ctx, w / 2, h * 0.52, 140 * s, s, figureP, t);

  // Closing blessing line
  const text1P = clamp((t - 1.8) / 1.2);
  if (text1P > 0) {
    ctx.save();
    ctx.globalAlpha = text1P;
    ctx.font = `600 ${28 * s}px 'Noto Serif Devanagari', serif`;
    ctx.fillStyle = project.theme.palette.lightGold;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(201, 162, 75, 0.8)';
    ctx.shadowBlur = 14 * s;
    ctx.fillText(project.copy.closing, w / 2, h * 0.74);
    ctx.restore();
  }

  // Names & Date
  const text2P = clamp((t - 3.2) / 1.2);
  if (text2P > 0) {
    ctx.save();
    ctx.globalAlpha = text2P;
    ctx.font = `700 ${38 * s}px 'Noto Serif Devanagari', serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(232, 208, 138, 0.9)';
    ctx.shadowBlur = 20 * s;
    ctx.fillText(`${project.couple.groomShort} संग ${project.couple.brideShort}`, w / 2, h * 0.82);

    ctx.font = `500 ${22 * s}px 'Noto Serif Devanagari', serif`;
    ctx.fillStyle = project.theme.palette.cream;
    ctx.shadowBlur = 0;
    ctx.fillText('11 दिसम्बर 2026 • समस्त परिवार', w / 2, h * 0.87);
    ctx.restore();
  }
}

// ==========================================
// DRAWING HELPERS
// ==========================================

function drawRoyalBackground(ctx: CanvasRenderingContext2D, w: number, h: number, project: Project) {
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, project.theme.palette.secondary);
  bgGrad.addColorStop(0.5, project.theme.palette.primary);
  bgGrad.addColorStop(1, project.theme.palette.secondary);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);
}

function drawRoyalBorder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  project: Project
) {
  const pad = 24 * s;
  ctx.save();
  ctx.strokeStyle = project.theme.palette.gold;
  ctx.lineWidth = 3 * s;
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

  // Inner thin border
  ctx.strokeStyle = 'rgba(232, 208, 138, 0.6)';
  ctx.lineWidth = 1 * s;
  ctx.strokeRect(pad + 6 * s, pad + 6 * s, w - (pad + 6 * s) * 2, h - (pad + 6 * s) * 2);

  // Corner motifs
  drawCornerMotif(ctx, pad, pad, 30 * s, 0);
  drawCornerMotif(ctx, w - pad, pad, 30 * s, Math.PI / 2);
  drawCornerMotif(ctx, w - pad, h - pad, 30 * s, Math.PI);
  drawCornerMotif(ctx, pad, h - pad, 30 * s, -Math.PI / 2);
  ctx.restore();
}

function drawCornerMotif(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rot: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#c9a24b';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.quadraticCurveTo(size * 0.4, size * 0.4, 0, size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawOrnateToran(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  goldColor: string,
  progress: number
) {
  ctx.save();
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  const arches = 5;
  const archW = w / arches;
  for (let i = 0; i < arches; i++) {
    const x0 = i * archW;
    const x1 = (i + 1) * archW;
    ctx.moveTo(x0, 40 * s);
    ctx.quadraticCurveTo((x0 + x1) / 2, 80 * s * progress, x1, 40 * s);
  }
  ctx.stroke();
  ctx.restore();
}

function drawGaneshEmblem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  goldColor: string,
  progress: number,
  t: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(progress, progress);

  // Halo pulse
  const haloR = r * (1 + Math.sin(t * 2) * 0.05);
  const halo = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, haloR);
  halo.addColorStop(0, 'rgba(232, 208, 138, 0.8)');
  halo.addColorStop(0.6, 'rgba(201, 162, 75, 0.4)');
  halo.addColorStop(1, 'rgba(201, 162, 75, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, haloR, 0, Math.PI * 2);
  ctx.fill();

  // Sacred Om / Swastik Circle
  ctx.fillStyle = '#4a1224';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw ॐ emblem
  ctx.font = `bold ${Math.round(r * 0.75)}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = goldColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ॐ', 0, 0);

  ctx.restore();
}

function drawNamasteIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  goldColor: string,
  progress: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(progress, progress);
  ctx.fillStyle = goldColor;

  // Stylized joined hands
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.6);
  ctx.bezierCurveTo(size * 0.35, -size * 0.2, size * 0.3, size * 0.4, 0, size * 0.6);
  ctx.bezierCurveTo(-size * 0.3, size * 0.4, -size * 0.35, -size * 0.2, 0, -size * 0.6);
  ctx.fill();

  // Central division line
  ctx.strokeStyle = '#4a1224';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.55);
  ctx.lineTo(0, size * 0.55);
  ctx.stroke();
  ctx.restore();
}

function drawGoldWaxSeal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);

  // Outer wax rim
  ctx.fillStyle = '#b8860b';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI * 2) / 16;
    const waveR = r * (0.95 + (i % 2 === 0 ? 0.08 : -0.05));
    const px = Math.cos(angle) * waveR;
    const py = Math.sin(angle) * waveR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Inner gold circle
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, '#ffd700');
  grad.addColorStop(0.5, '#c9a24b');
  grad.addColorStop(1, '#8b6508');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.fill();

  // Engraved initials H & K
  ctx.fillStyle = '#4a1224';
  ctx.font = `bold ${Math.round(r * 0.45)}px 'Cinzel Decorative', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H&K', 0, 0);

  ctx.restore();
}

function drawCalligraphyNib(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.4);
  ctx.fillStyle = '#c9a24b';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-s * 0.4, -s * 1.5);
  ctx.lineTo(s * 0.4, -s * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGoldShimmerSweep(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  p: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const sweepX = x - w + p * (w * 2);
  const grad = ctx.createLinearGradient(sweepX, y, sweepX + 120, y + h);
  grad.addColorStop(0, 'rgba(255, 215, 0, 0)');
  grad.addColorStop(0.5, 'rgba(255, 248, 220, 0.55)');
  grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawSparkleBurst(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  maxR: number,
  p: number
) {
  ctx.save();
  const numSparkles = 14;
  for (let i = 0; i < numSparkles; i++) {
    const angle = (i * Math.PI * 2) / numSparkles;
    const dist = maxR * p;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    const alpha = clamp(1 - p);

    ctx.fillStyle = `rgba(255, 223, 128, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 3 + (1 - p) * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpotlightBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  s: number,
  label: string
) {
  ctx.save();
  // Golden border with soft glow
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 3 * s;
  ctx.shadowColor = 'rgba(232, 208, 138, 0.9)';
  ctx.shadowBlur = 18 * s;
  ctx.strokeRect(x, y, w, h);

  // Label tag at corner
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(74, 18, 36, 0.85)';
  ctx.fillRect(x, y - 24 * s, ctx.measureText(label).width + 30 * s, 24 * s);
  ctx.font = `600 ${14 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = '#e8d08a';
  ctx.fillText(label, x + 8 * s, y - 7 * s);
  ctx.restore();
}

function drawGrandCoupleBanner(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  project: Project,
  p: number
) {
  ctx.save();
  ctx.translate(w / 2, h * 0.5);
  ctx.scale(p, p);

  // Banner background
  const bw = w * 0.88;
  const bh = 140 * s;
  ctx.fillStyle = 'rgba(74, 18, 36, 0.94)';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 30 * s;
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);

  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 3 * s;
  ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);

  // Names
  ctx.font = `700 ${36 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(232, 208, 138, 0.9)';
  ctx.shadowBlur = 15 * s;
  ctx.fillText(`${project.couple.groom} संग ${project.couple.bride}`, 0, -10 * s);

  ctx.font = `600 ${22 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = '#e8d08a';
  ctx.shadowBlur = 0;
  ctx.fillText(project.copy.title, 0, 32 * s);
  ctx.restore();
}

function drawBaraatRouteMap(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  s: number,
  progress: number
) {
  ctx.save();
  ctx.fillStyle = 'rgba(40, 10, 20, 0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 2 * s;
  ctx.strokeRect(x, y, w, h);

  const startX = x + w * 0.15;
  const startY = y + h * 0.5;
  const endX = x + w * 0.85;
  const endY = y + h * 0.5;

  // Dotted route line
  ctx.setLineDash([6 * s, 4 * s]);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Animated Royal Horse / Baraat position
  const curX = startX + (endX - startX) * progress;
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(curX, startY, 10 * s, 0, Math.PI * 2);
  ctx.fill();

  // Pin labels
  ctx.font = `600 ${13 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = '#e8d08a';
  ctx.textAlign = 'center';
  ctx.fillText('महारानी कॉलोनी (प्रस्थान 7 PM)', startX, startY - 18 * s);
  ctx.fillText('धनकी मोड़ (विवाह स्थल)', endX, endY + 28 * s);
  ctx.restore();
}

function drawReceptionVenuePin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  s: number,
  progress: number
) {
  ctx.save();
  ctx.fillStyle = 'rgba(40, 10, 20, 0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 2 * s;
  ctx.strokeRect(x, y, w, h);

  // Glowing pin
  const pinX = x + w / 2;
  const pinY = y + h * 0.32;

  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath();
  ctx.arc(pinX, pinY, 9 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `700 ${16 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('पटना सिटी क्लब उत्सव हॉल', pinX, pinY + 30 * s);

  ctx.font = `400 ${13 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = '#e8d08a';
  ctx.fillText('कमलदह पथ, अखिलेश नगर, अगमकुआँ, पटना', pinX, pinY + 52 * s);
  ctx.restore();
}

function drawIllustratedRoyalCouple(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  s: number,
  p: number,
  t: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p, p);

  // Traditional illustrated figures (Groom & Bride)
  const bowAngle = Math.sin(t * 1.5) * 0.08; // respectful gentle bow

  // Groom (Gold Sherwani & Turban on left)
  ctx.save();
  ctx.translate(-45 * s, 0);
  ctx.rotate(bowAngle);
  ctx.fillStyle = '#c9a24b'; // gold sherwani
  ctx.beginPath();
  ctx.roundRect(-22 * s, -h * 0.45, 44 * s, h * 0.85, 10 * s);
  ctx.fill();
  // Turban
  ctx.fillStyle = '#8b1c2b';
  ctx.beginPath();
  ctx.arc(0, -h * 0.48, 20 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Bride (Royal Red Lehenga & Odhni on right)
  ctx.save();
  ctx.translate(45 * s, 0);
  ctx.rotate(-bowAngle);
  ctx.fillStyle = '#8b1c2b'; // red lehenga
  ctx.beginPath();
  ctx.moveTo(-28 * s, h * 0.4);
  ctx.lineTo(28 * s, h * 0.4);
  ctx.lineTo(15 * s, -h * 0.35);
  ctx.lineTo(-15 * s, -h * 0.35);
  ctx.closePath();
  ctx.fill();
  // Odhni gold border
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3 * s;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawFloatingPetals(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  t: number,
  count = 35
) {
  const rng = new DeterministicRNG(98765);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const seedX = rng.next();
    const seedSpeed = rng.range(0.08, 0.18);
    const seedSize = rng.range(6, 14) * s;
    const isMarigold = i % 2 === 0;

    const y = ((t * seedSpeed * h + seedX * h) % (h + 40 * s)) - 20 * s;
    const sway = Math.sin(t * 2 + i) * 25 * s;
    const x = (seedX * w + sway) % w;

    ctx.fillStyle = isMarigold ? 'rgba(232, 162, 58, 0.75)' : 'rgba(217, 70, 90, 0.75)';
    ctx.beginPath();
    ctx.ellipse(x, y, seedSize, seedSize * 0.6, (t + i) * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFallbackEnvelope(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  s: number,
  project: Project
) {
  ctx.fillStyle = '#faf3e7';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 4 * s;
  ctx.strokeRect(x, y, w, h);

  ctx.font = `700 ${28 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = '#541525';
  ctx.textAlign = 'left';
  ctx.fillText('मंगल परिणय', x + 30 * s, y + 50 * s);
  ctx.fillText('11-12-2026 (शुक्रवार)', x + 30 * s, y + 85 * s);

  ctx.fillText(`${project.couple.groomShort} संग ${project.couple.brideShort}`, x + 30 * s, y + 130 * s);
}

function drawTypesetCard1(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  s: number,
  project: Project
) {
  ctx.fillStyle = project.cards.card1.paperColor;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 4 * s;
  ctx.strokeRect(x, y, w, h);

  ctx.font = `700 ${26 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = project.cards.card1.textColor;
  ctx.textAlign = 'center';
  ctx.fillText(project.copy.ganesh, x + w / 2, y + 50 * s);

  ctx.font = `600 ${24 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillText(`${project.families.groom.honorific} ${project.couple.groom}`, x + w * 0.3, y + h * 0.28);
  ctx.fillText(`${project.families.bride.honorific} ${project.couple.bride}`, x + w * 0.7, y + h * 0.28);

  ctx.font = `700 ${32 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = '#c9a24b';
  ctx.fillText(project.copy.title, x + w / 2, y + h * 0.52);
}

function drawTypesetCard2(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  s: number,
  project: Project
) {
  ctx.fillStyle = project.cards.card2.paperColor;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#c9a24b';
  ctx.lineWidth = 4 * s;
  ctx.strokeRect(x, y, w, h);

  ctx.font = `700 ${26 * s}px 'Noto Serif Devanagari', serif`;
  ctx.fillStyle = project.cards.card2.textColor;
  ctx.textAlign = 'center';
  ctx.fillText('॥ मांगलिक कार्यक्रम ॥', x + w / 2, y + 50 * s);

  project.events.forEach((ev, idx) => {
    ctx.font = `600 ${18 * s}px 'Noto Serif Devanagari', serif`;
    ctx.fillText(`${ev.day}, ${ev.date} : ${ev.title}`, x + w / 2, y + 120 * s + idx * 55 * s);
  });
}
