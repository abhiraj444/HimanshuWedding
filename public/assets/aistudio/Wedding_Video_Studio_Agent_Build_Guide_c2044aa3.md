# Wedding Video Studio: Build Guide for an AI Agent

**How to use:** give this whole guide, plus the 8 card photos, to your coding agent. Ask it to raise the open questions in section 16 first, then build in the milestones of section 15.

## 1. Mission

Build a browser-based **video studio** that turns the owner's wedding-card details and artwork into a finished invitation video (MP4). The owner can add or remove any detail, upload their own images and videos, preview the animation live, and download the result. All text is typeset by the browser from real fonts, so the Hindi text is always exact.

The video concept (the default template):

1. A welcome message asking for everyone's blessings.
2. The sealed envelope appears (without the blank addressee lines and without any sender phone or address).
3. The envelope opens by itself, a folder rises out of it, and the folder's doors open.
4. Card 1 comes out and presents the names of the groom and bride.
5. Card 2 follows and highlights each ceremony one by one, with its timing and venue.
6. The cards fold back into the folder, the folder goes back into the envelope, and the flap closes.
7. Finale: an animated, illustrated groom and bride take blessings. Illustrated figures only, never real photos of people.

**Success test:** the owner edits an event time, taps Export, and within a few minutes downloads a smooth 1080x1920 MP4 whose every Devanagari character matches the details form exactly.

## 2. Hard rules

- **Text is never AI-generated or retyped.** Every string comes from the project data. Use Unicode NFC. Load every font with `document.fonts.load` before the first frame is drawn, and block export if any glyph is missing from the font.
- **Local only.** No uploads to any server, no analytics, no accounts. Projects and assets live in IndexedDB on the owner's device.
- **Deterministic rendering.** The picture at time `t` is a pure function of the project data and `t`. Never use `Date.now()` or an unseeded `Math.random()` inside rendering; use a seeded random generator for petals and particles. This makes the preview and the export identical and the export frame-perfect.
- **Privacy.** Never draw the sender phone number or house address that is printed on the envelope. The photo cleanup step must erase them.
- **Licensing.** Ship no copyrighted music or fonts. Only open-licensed fonts (Tiro Devanagari Hindi, Noto Serif Devanagari, Kalam, Cormorant Garamond). Built-in sound effects are synthesized in code.
- **Pin every dependency to an exact version.** Keep the dependency list short.
- **Motion safety:** keep flashing and strobing out of the animation.

## 3. Product overview: five screens

1. **Details:** forms for the couple, both families, ceremonies, venues, welcome and closing lines, guest name, and music. Add, remove and drag-reorder events and lines.
2. **Assets:** slots for the photos and clips (section 8), with the cleanup tools.
3. **Scenes:** the editable timeline (section 7): reorder, retime, swap the effect, turn scenes on or off.
4. **Preview and Export:** live player, proof sheet, presets, export.
5. **Guests:** a list of names for personalised videos (section 10).

Autosave to IndexedDB. Provide Export project and Import project (a single `.json` plus an assets bundle in a `.zip`).

## 4. Tech stack and architecture

- **App:** Vite + TypeScript. UI in plain TypeScript or a light framework (Preact or Svelte). Keep the bundle small.
- **Rendering:** Three.js for the 3D scenes (envelope flap, folder doors, page turns, card flips), where cards and figures are textured planes with a real hinge. Text is drawn with Canvas 2D at 2x resolution into textures. Fall back to plain Canvas 2D with pseudo-3D transforms if WebGL is unavailable.
- **Encoding and export:** WebCodecs `VideoEncoder` and `AudioEncoder`, muxed by `mp4-muxer` (or its successor, Mediabunny). Fallback: `MediaRecorder` (real-time, WebM or MP4 depending on the browser) with a visible warning.
- **Storage:** IndexedDB (use the `idb` library). **Zip:** `fflate`.
- **Offline background removal:** `@imgly/background-removal`, lazy-loaded and optional.
- **Hosting:** any static host. No backend.

**Folder layout:**

```
/src
  /engine      clock.ts, renderFrame.ts, easing.ts, rng.ts
  /scenes      welcome.ts, envelopeGate.ts, envelopeOpen.ts, folderRise.ts,
               folderDoors.ts, cardReveal.ts, cardSwap.ts, eventHighlight.ts,
               foldAndPack.ts, blessingFinale.ts
  /text        layout.ts, fitText.ts, proofSheet.ts, fonts.ts
  /assets      store.ts, deskew.ts, cutout.ts, videoClip.ts, audio.ts
  /export      encode.ts, mux.ts, presets.ts, batch.ts
  /ui          screens and components
  /data        defaultProject.ts, schema.ts
```

**Engine contract:**

```ts
interface Scene { id: string; start: number; duration: number; params: Record<string, unknown>; }
function renderFrame(project: Project, t: number, ctx: RenderContext): void;
// Preview: requestAnimationFrame drives t from the clock.
// Export: for (let n = 0; n < total; n++) { renderFrame(project, n / fps, ctx); encode(n); }
```

## 5. Data model

```ts
interface Project {
  locale: 'hi' | 'en';
  couple: { groom: string; bride: string; groomShort: string; brideShort: string };
  families: { groom: Family; bride: Family };
  events: EventItem[];            // add, remove, reorder
  copy: Record<string, string>;   // welcome, invitation, closing, shloka lines
  guest: { name: string; salutation?: string; family?: boolean };
  theme: Theme;                   // palette, fonts, motion intensity
  assets: Record<SlotId, AssetRef | null>;
  scenes: Scene[];
  audio: { musicId?: string; volume: number; fadeIn: number; fadeOut: number };
  export: ExportSettings;
}
interface EventItem {
  id: string; date: string;        // ISO date
  day: string; title: string;
  time: string | null;             // 'HH:MM' or null
  venue: string | null; from?: string; note?: string;
  icon: 'mehendi' | 'haldi' | 'baraat' | 'reception' | 'custom';
  highlight: boolean;
}
```

## 6. Default project content (from the owner's card)

Proofread every string against the card photos. Mark all strings 'owner-verified' in the proof sheet.

```ts
export const DEFAULT = {
  couple: { groom: 'हिमांशु राज', bride: 'काजल कुमारी', groomShort: 'हिमांशु', brideShort: 'काजल' },
  families: {
    groom: { honorific: 'चि०', lines: [
      'सुपौत्रः स्व० रामकृष्ण सिंह',
      'सुपुत्रः श्री राजीव कुमार एवं श्रीमती रंजुलता सिन्हा',
      'ग्रा०+पो०- बाँकीपुर मछरियावाँ, थाना- फतुहाँ, जिला- पटना'] },
    bride: { honorific: 'आयु०', lines: [
      'सुपुत्रीः श्री इन्द्रदेव सिंह एवं श्रीमती बॉबी देवी',
      'धनकी मोड़, अगमकुआँ, पटना'] }
  },
  copy: {
    ganesh: '॥ श्री गणेशाय नमः ॥',
    welcome1: 'आप सभी के आशीर्वाद और शुभकामनाओं के साथ…',
    welcome2: 'हम आपको आमंत्रित करते हैं',
    title: '॥ पावन परिणयोत्सव ॥',
    invitation: 'के शुभ अवसर पर आप सपरिवार सम्मिलित होकर अपना आशीर्वाद वर-वधू को प्रदान कर हमें अनुगृहीत करें।',
    seen: 'दर्शनाभिलाषी: समस्त परिवार',
    wellwishers: 'आकांक्षी: श्री राजीव कुमार, श्रीमती रंजुलता सिन्हा, सुधांश रंजन',
    closing: 'आपके आशीर्वाद के बिना हमारी खुशियाँ अधूरी हैं'
  },
  events: [
    { id: 'e1', date: '2026-12-09', day: 'बुधवार', title: 'मटकोर एवं मेंहदी', time: null, venue: null, icon: 'mehendi' },
    { id: 'e2', date: '2026-12-10', day: 'गुरुवार', title: 'मण्डपाच्छादन, पूजा, हल्दी कलश एवं घृतढारी', time: null, venue: null, icon: 'haldi' },
    { id: 'e3', date: '2026-12-11', day: 'शुक्रवार', title: 'बारात प्रस्थान एवं रात्रि में शुभ विवाह', time: '19:00',
      from: 'महारानी कॉलोनी, रोड नं०-2, अगमकुआँ, पटना',
      venue: 'धनकी मोड़, नियर नोवा हॉस्पिटल, अगमकुआँ, पटना', icon: 'baraat' },
    { id: 'e4', date: '2026-12-13', day: 'रविवार', title: 'वर-वधू स्वागत समारोह एवं प्रीतिभोज', time: '19:00',
      venue: 'पटना सिटी क्लब उत्सव हॉल, कमलदह पथ, अखिलेश नगर, अगमकुआँ, पटना', icon: 'reception' }
  ]
};
```

When `time` or `venue` is null, the video shows: समय एवं स्थान की सूचना शीघ्र दी जाएगी. Never invent a time or venue. The optional shloka and couplet lines from Card 1 and Card 2 are editable fields that start empty; the owner types or pastes them from the card and approves them in the proof sheet.

## 7. Scenes: default timeline (about 75 s, 30 fps, 9:16)

Every scene is data: `start`, `duration`, the asset slots it uses, the text keys it shows, and its easing. The owner can retime, reorder, disable, or duplicate any scene.

1. **Welcome (0:00 to 0:06):** blush gradient, cherry-blossom corners, Ganesh emblem, three text lines revealed with 60 ms word stagger, animated namaste icon.
2. **Envelope gate (0:06 to 0:11):** the envelope floats up and settles with a slight 3D tilt. The guest name is written on the 'सेवा में' line (Kalam) with a pen-reveal. Gold shimmer sweeps across the couple names and the date.
3. **Envelope opens (0:11 to 0:16):** flip to the back (rotateY 180), then the flap lifts on a top hinge with a warm glow.
4. **Folder rises (0:16 to 0:21):** the folder slides up, the envelope drops away and fades, the folder turns upright.
5. **Folder doors (0:21 to 0:26):** two panels swing open from the centre strip (about 110 degrees), revealing the elephant-procession interior. Sparkle burst, slow push-in.
6. **Card 1, names (0:26 to 0:38):** the green card rises and fills the frame. A gold spotlight visits, in order: groom block, handshake emblem, bride block, the title, the invitation line, and the closing names. At 0:36 the names appear large and centred for 2 s.
7. **Card swap (0:38 to 0:42):** page-turn transition to Card 2.
8. **Event highlights (0:42 to 1:00):** dim the card; spotlight each event row (about 4 s each) with an icon pop-in. Event 3 adds an animated route (two pins, dotted line, a small horse) from the departure point to the destination. Event 4 adds a map pin with the venue name. Events with null time show the 'to be informed' line.
9. **Fold and pack (1:00 to 1:06):** Card 2 and Card 1 slide back into the folder, doors close, the folder goes into the envelope, the flap closes and a gold seal stamps on.
10. **Blessing finale (1:06 to 1:15):** the envelope drifts to a corner; flat-illustrated groom and bride walk in, join hands, do namaste, then bow in a charan-sparsh gesture. Petals fall; the closing line, couple names, wedding date and 'समस्त परिवार' appear one by one. Hold the emblem for 2 s.

**Two ways to show cards (owner chooses per card):**

- **Photo mode:** the cleaned photo of the real card is used as the texture, and highlights are placed on **hotspots**, rectangles the owner draws on the card image in a hotspot editor. The agent should pre-place sensible hotspots after viewing the photos.
- **Typeset mode:** the card is redrawn from the project data (paper colour, border art and motifs from the assets, text laid out by the engine). Use this when any detail has changed, because the printed photo would then be out of date.

## 8. Asset system

Slots (each accepts PNG, JPG or WebP; slots marked V also accept MP4 or WebM):

- envelope front, envelope back, flap, folder cover, folder inside (V), card 1, card 2
- groom figure, bride figure, elephant panels, border strip, emblem set
- backgrounds: welcome (V), finale (V)
- music, and optional custom sound effects

**Image tools:**

- **Deskew:** drag four corners, perspective-correct with a homography.
- **Cutout:** in-browser background removal plus a manual brush for fixes; keep alpha.
- **Erase tool:** paint over regions (used to hide the blank addressee lines and the sender block).
- **Colour match:** white-balance and glare reduction so all assets share one palette.
- **Warnings:** flag images below 1000 px on the long side.
- Keep the original and the processed version of every upload.

**Video clips:**

- Trim in/out, loop, mute, fit (cover or contain), rounded-corner mask. Maximum 15 s and 1080p per clip.
- For frame-exact export, set `video.currentTime` for each frame and wait for `seeked`, then draw. Pre-warm the clip before export starts.

**Audio:**

- Music upload (MP3, WAV, M4A): trim, volume, fade in and out. Built-in synthesized chimes and whooshes are generated with `OfflineAudioContext`.
- Mix the whole track offline, then encode it with `AudioEncoder` (AAC, `mp4a.40.2`).
- Warn that copyrighted film songs may be muted by WhatsApp and Instagram.

## 9. Text accuracy system

- **Fitting:** auto-wrap and shrink long lines within a safe area, and never clip a matra or conjunct. Use line-height of at least 1.5 for Devanagari.
- **Proof sheet:** a screen listing every string that appears in the video, in the order it appears, with the scene and timestamp. The owner ticks each line as approved. Export is blocked, with a clear message, until all lines are approved or the owner overrides. Changing a string un-approves it.
- **Glyph check:** reject or warn on characters the chosen font cannot draw.
- **Safe zones for 9:16:** keep important text inside 8% side margins and clear of the top and bottom 10%, where phone interfaces cover the picture.

## 10. Guests and personalised videos

- Paste or import a list of names (one per line, optional salutation). The guest name appears on the envelope and, optionally, in the finale line.
- **MVP:** render the full video for each name in sequence, with a progress list, and offer the results as one `.zip` (`Invitation-<name>.mp4`).
- **Optimisation:** the music track and everything after the personalised intro are identical for all guests. Render and cache the shared encoded chunks once, then for each guest encode only the intro, and append the cached chunks with shifted timestamps. This needs identical encoder settings and a keyframe at the join point.
- Show an honest time estimate before starting.

## 11. Preview and export

**Presets:** 1080x1920 at 30 fps, about 8 Mbps (default); 720x1280; 1080x1080; 1920x1080; and **WhatsApp-friendly**, which picks a bitrate so the file stays under about 15 MB: `videoBitrate = (15 MB x 8) / duration - 128 kbps audio`.

**Pipeline:**

1. Check `VideoEncoder.isConfigSupported` (prefer H.264 `avc1.640028` for 1080p), otherwise offer a smaller preset.
2. Set a keyframe every 2 s and keep `encodeQueueSize` under 8 for backpressure.
3. For each frame: `renderFrame` then `new VideoFrame(canvas, { timestamp })` then encode, then close the frame immediately.
4. Mux with `fastStart: 'in-memory'` and download as a Blob.
5. Show progress, ETA, a cancel button, and a final 'Share' button using `navigator.share({ files })` where available.
6. Also export a PNG poster frame for link previews.

**Preview quality:** render at reduced resolution when the frame rate drops, but export always at full quality.

## 12. Motion and visual rules

- **Palette:** maroon `#6E1F34`, deep maroon `#4A1224`, gold `#C9A24B`, light gold `#E8D08A`, blush `#F4E1E0`, rose `#D9A9B1`, cream `#FBF3DC`, pale green `#DDE8CF`, marigold `#E8A23A`.
- **Easing:** `cubic-bezier(.22,.8,.2,1)` for entrances; `ease-in-out` for camera moves. Add 3 to 5% overshoot on settles. No hard cuts; transitions last at least 500 ms.
- **Camera:** a slow push from 1.00 to 1.06 across each scene, with parallax layers moving at different speeds.
- **Gold foil:** gradient text with a 900 ms shimmer sweep, used only at large sizes or on dark backgrounds.
- **Petals:** seeded, at most 40 on screen, falling with a gentle sway. **Spotlight:** a soft-edged dimming mask with a gold rim glow.
- **Studio UI:** warm cream and maroon with gold accents, serif Devanagari headings, large touch targets, one clear primary button per screen.

## 13. Quality requirements

- Preview at 30 fps on a mid-range laptop; no memory leaks across repeated exports (dispose textures and close frames).
- Texture sizes at most 2048 px on mobile and 4096 px on desktop.
- Studio UI: keyboard operable, visible focus, AA contrast, Hindi labels available.
- Autosave never blocks the UI.

## 14. Test plan

- **Golden frames:** render fixed timestamps (for example 3 s, 8 s, 14 s, 30 s, 50 s) and compare to stored images.
- **Proof checks:** test strings with conjuncts and matras, such as 'क्ष त्र ज्ञ श्री द्वारा प्रीतिभोज घृतढारी'. Test very long names and Latin names.
- **Export:** exported duration equals the timeline; audio stays in sync across the full video; plays in WhatsApp, Android gallery, iPhone Photos and VLC.
- **Fallbacks:** MediaRecorder path works; missing WebCodecs shows a clear message.
- **Weekdays match dates:** 9 Dec 2026 Wednesday, 10 Dec Thursday, 11 Dec Friday, 13 Dec Sunday.

## 15. Milestones and deliverables

1. **M1:** engine, data model, Welcome + Envelope + Folder scenes, MP4 export with music.
2. **M2:** all ten scenes, hotspot editor, typeset-card mode.
3. **M3:** asset tools (deskew, cutout, erase), video clips, audio mixing.
4. **M4:** proof sheet, presets, WhatsApp preset, project import and export.
5. **M5:** guests batch with zip, polish, test plan.

Deliver the source, a README (how to edit details, upload assets, and export), and one finished sample video built from the owner's photos. Definition of done: sections 3, 9, 11 and 14 all pass on a real laptop and a real phone.

## 16. Open questions to confirm with the owner before building

- Times and venues for 9 Dec and 10 Dec.
- The main wedding venue on 11 Dec, if different from Dhanki Mod.
- Preferred music (or none), and whether sound effects should be on.
- Whether guest names should also appear in the finale line.
- The exact wording of the Card 1 shloka and the Card 2 couplet, to be typed from the cards.
- Whether the same site should also host the guest invitation page from the earlier guide.
