# 🎵 Note-ation
### Free, Modern Web Application for Music Notation

[![Live Demo](https://img.shields.io/badge/Live_App-monzenn.github.io%2FNote--ationWeb-22c55e?style=for-the-badge&logo=githubpages&logoColor=white)](https://monzenn.github.io/Note-ationWeb/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](https://opensource.org/licenses/MIT)

> 🌐 **Live Website:** [https://monzenn.github.io/Note-ationWeb/](https://monzenn.github.io/Note-ationWeb/)

**Note-ation** is an open-source, 100% client-side web application designed for fast, intuitive, and professional music notation editing directly in your web browser. It combines a rapid keyboard-driven workflow and horizontal ribbon canvas with an advanced vector sheet view, dynamic typography, realistic multi-instrument Web Audio synthesis, automatic chord realization, and multi-page print/PDF export.

**Created and Developed by Ramon John L. Dela Cruz**

---

## 🌟 Key Highlights & Philosophy

- **100% Free & Open Source:** Free to use, modify, and distribute under the permissive MIT License.
- **Zero Backend / Complete Privacy:** Operates entirely inside your browser using client-side JavaScript/TypeScript and standard Web APIs. No accounts, no servers, no databases, and zero tracking or telemetry. Your music files remain 100% private on your local device.
- **Instant In-Browser Access:** Launch [monzenn.github.io/Note-ationWeb](https://monzenn.github.io/Note-ationWeb/) to start composing immediately without installing software or registering an account.
- **Dual Visual Workflows:**
  - **Continuous Ribbon View:** A smooth, horizontally scrolling multi-staff canvas optimized for rapid note entry, auditioning, and real-time editing.
  - **Paginated Page View:** A print-ready multi-page layout engine with automatic measure packing, system justification, dynamic headers, system brackets/braces, measure numbers, and vector PDF export.
- **Precision Vector SVG Notation Engine:** High-resolution SMuFL-standard vector music glyphs for notes (double whole down to 256th micro-durations), stems, beams, flags, accidentals, ledger lines, cross-measure ties, phrasing slurs, tuplets, expressions, dynamics, hairpins, and barlines.
- **Polyphonic Substaff Architecture:** Dedicated secondary melody substaves (Voice 2) rendered alongside primary staves in Ribbon View and cleanly merged with polyphonic stem-direction engraving in Page and Print views.
- **Harmonized Audio & Chord Realization:** Native chord symbol parser recognizing triads, 7ths, suspensions, extensions, and slash chords with synchronized acoustic piano playback.
- **Realistic Pure Web Audio Instrument Engine:** 9 acoustic instrument timbres (Grand Piano, Upright Piano, Violin, Viola, Cello, Flute, Piccolo, Harp, Church Pipe Organ) with procedural hammer/breath/bow friction noise transients, dynamic filter decays, wood body resonance formants, organic micro-intonation, and smooth legato portamento.
- **Proportional Staff & Notation Scaling:** Customize staff scale ($50\%$ to $150\%$) with automatic layout re-calculation, ensuring crisp, professional scores for compact hymn sheets, solo leads, or large orchestral works.
- **Dynamic Page Setup & Typography:** Customize font families, font sizes, and styles for titles, composers, lyricists, staff lyrics, measure numbers, chord symbols, and page headers.
- **Rapid Keyboard Workflow:** Comprehensive numerical duration shortcuts (`1`–`6`), accidentals (`7`–`9`), note/rest insertion (`Enter`, `Space`, `Ctrl+Enter`), structural dialogs (`C`, `K`, `Shift+T`, `T`, `R`, `Alt+T`), and atomic batch editing.
- **Multi-Verse Lyrics Engine:** Multi-verse lyric drawer with automated syllable tokenization, hyphenation, and dynamic note alignment.
- **Open File Format (`.noteweb`):** Human-readable, structured JSON format for exporting, importing, and sharing your musical compositions.

---

## 🚀 Feature Overview

### 1. Music Engraving & Elements
- **Durations & Augmentation:** Double Whole, Whole (`1`), Half (`2`), Quarter (`3`), Eighth (`4`), Sixteenth (`5`), Thirty-Second (`6`), 64th, 128th, and 256th notes and rests, supporting single and double augmentation dots (`.`).
- **Pitches & Accidentals:** Full chromatic range across Treble, Bass, Alto, and Tenor clefs, supporting Naturals ($\natural$), Flats ($\flat$), and Sharps ($\sharp$).
- **Metric Note Beaming Engine:** Automatic metric beat grouping with manual toggle (`B`) and batch beaming supporting up to senary beam polygons (256th notes) and fractional stubs.
- **Ties & Phrasing Slurs:** Cross-measure Bézier tie spanners opposite stem direction with audio sustain chaining, and multi-note phrasing slurs with Gould/Read mixed-stem clearance.
- **Dynamics & Spanners:** SMuFL dynamic markings ($ppp$, $pp$, $p$, $mp$, $mf$, $f$, $ff$, $fff$, $sfz$, $fz$), scalable crescendo/decrescendo hairpins (`<`, `>`), and continuous `cresc.` / `decresc.` text spanners with playback volume interpolation.
- **Articulations & Ornaments:** Staccato (`,`), Tenuto (`_`), Accents (`>`), Marcato, Staccatissimo, Fermatas, Trills, Mordents, and Turns with intelligent stem-relative positioning.
- **Structural Markings:** Single, Double, and Final bar lines, repeat signs ($|:$, $:|$), first and second endings (voltas), and flow marks (Segno, Coda, Fine, D.C. al Fine, D.S. al Coda).
- **Tempo & Metronome:** Mid-score tempo changes (`Alt+T`) supporting standard beat units (♩, ♩., ♪, 𝅗𝅥), BPM ranges from 20 to 400, Italian presets, and custom text.

### 2. Multi-Staff & Substaff Architecture
- **Staff Manager:** Add, delete, reorder, rename, mute/unmute, assign instruments, and set volume weighting across unlimited independent staves.
- **Secondary Melody Substaff:** Independent Voice 2 editing lanes in Ribbon View merged into clean polyphonic engraving in Page View with automatic stem flipping (Voice 1 UP, Voice 2 DOWN).
- **Multi-Staff Measure Grid:** Synchronized vertical barlines and beat alignment across all staves.
- **Universal Selection & Clipboard:** Click-and-drag or `Shift + Arrow` range selection with Cut (`Ctrl+X`), Copy (`Ctrl+C`), and Paste (`Ctrl+V`) supporting cross-staff pasting and internal slur remapping.
- **50-Level Undo/Redo:** Reliable single-step undo (`Ctrl+Z`) and redo (`Ctrl+Y` / `Ctrl+Shift+Z`) history stack across all editing and batch actions.

### 3. Sound Synthesis & Audio Playback
- **9 Realistic Instruments:** Pure Web Audio synthesis modeled after acoustic instruments:
  - *Grand Piano* & *Upright Piano*: Felt/wood hammer impulse transients, string inharmonicity, and frequency-dependent exponential damping.
  - *Violin*, *Viola*, *Cello*: Bow friction noise, body resonance formants, delayed vibrato swell, organic note-attack micro-intonation, and seamless legato portamento crossfades.
  - *Flute* & *Piccolo*: Breath turbulence and second harmonic warmth.
  - *Concert Harp*: Plucked physical modeling with dynamic filter sweeps.
  - *Church Pipe Organ*: 6-rank drawbar harmonics (16', 8', 4', 2⅔', 2', 1⅗').
- **Chord Playback:** Automatic harmonic realization of chord symbols played on acoustic rhythm piano.
- **Interactive Audition:** Instant auditory pitch feedback on note entry and chord building.

### 4. Typography, Lyrics & Page Layout
- **Custom Fonts:** Independently assign typography (e.g. *Georgia*, *Times New Roman*, *Garamond*, *Helvetica*, *Courier New*) and sizing across 9 score text categories.
- **Custom Margins & Spacing:** Adjust top, bottom, left, and right margins, staff line spacing, and system spacing.
- **Multi-Verse Sheet Lyrics:** Aligned lyrics with automated hyphenation, syllable distribution, and low-pitch clearance.
- **Vector PDF Print:** Browser-native vector printing (`window.print()`) formatted for Letter and A4 pages with zero UI clipping.

---

## ⌨️ Keyboard Shortcuts Reference

Note-ation is built from the ground up for lightning-fast keyboard-driven composition:

| Key / Shortcut | Scope / Context | Action |
|---|---|---|
| `1` | Note Entry / Selection | Set duration to **Whole** note |
| `2` | Note Entry / Selection | Set duration to **Half** note |
| `3` | Note Entry / Selection | Set duration to **Quarter** note |
| `4` | Note Entry / Selection | Set duration to **Eighth** note |
| `5` | Note Entry / Selection | Set duration to **16th** note |
| `6` | Note Entry / Selection | Set duration to **32nd** note |
| `.` | Note Entry / Selection | Toggle / cycle augmentation dots ($0 \to 1 \to 2 \to 0$) |
| `7` | Note Entry / Selection | Toggle **Natural** ($\natural$) accidental |
| `8` | Note Entry / Selection | Toggle **Flat** ($\flat$) accidental |
| `9` | Note Entry / Selection | Toggle **Sharp** ($\sharp$) accidental |
| `Enter` | Cursor Position | Insert note at current pitch and duration |
| `Enter` | Active Selection | Batch convert selected rests to notes |
| `Ctrl + Enter` | Cursor Position | Add note to chord at current cursor position |
| `Space` | Cursor Position | Insert rest with current duration & dots |
| `Space` | Active Selection | Batch convert selected notes to rests |
| `Tab` | Cursor Position | Insert standard single bar line |
| `ArrowUp` / `ArrowDown` | Normal Entry | Move pitch offset up/down diatonically (with audio audition) |
| `ArrowUp` / `ArrowDown` | Active Selection | Batch transpose selected notes up/down diatonically |
| `d` / `D` | Normal Entry / Selection | Cycle stem direction (`auto` $\to$ `up` $\to$ `down` $\to$ `auto`) |
| `Ctrl + ArrowUp/Down` | Global | Switch active staff up / down |
| `ArrowLeft` / `ArrowRight` | Normal Entry | Move insertion cursor left / right |
| `Shift + Left / Right` | Selection | Expand / contract range selection |
| `Home` / `End` | Normal Entry | Jump cursor to start / end of active staff |
| `PageUp` / `PageDown` | Normal Entry | Jump cursor to previous / next bar line |
| `Backspace` | Normal Entry | Delete preceding element |
| `Delete` | Normal Entry | Delete following element |
| `Backspace` / `Delete` | Active Selection | Batch delete all selected elements |
| `/` | Note Entry / Selection | Toggle phrasing slur (`slurOut`) |
| `;` | Note Entry / Selection | Toggle tie (`tieOut`) |
| `,` | Note Entry / Selection | Toggle staccato articulation |
| `_` or `Shift + -` | Note Entry / Selection | Toggle tenuto articulation |
| `B` | Note Entry / Selection | Toggle note beaming |
| `Shift + 3` | Note Entry / Selection | Toggle triplet tuplet |
| `<` / `>` | Selection Range | Toggle crescendo (`<`) / decrescendo (`>`) hairpin |
| `X` or `Shift + E` | Note Entry | Open Expression & Ornaments dialog |
| `C` | Global | Open Clef insertion dialog |
| `K` | Global | Open Key Signature insertion dialog |
| `Shift + T` | Global | Open Time Signature insertion dialog |
| `T` or `Ctrl + K` / `Ctrl + M` | Global | Open Text / Chord symbol dialog |
| `Alt + T` | Global | Open Tempo & Metronome dialog |
| `R` | Global | Open Repeats & Endings dialog |
| `Ctrl + Shift + P` | Global | Open Page Setup & Typography dialog |
| `F5` / `F6` | Global | Start / Stop score audio playback |
| `Ctrl + Z` / `Cmd + Z` | Global | Undo last action |
| `Ctrl + Y` / `Ctrl+Shift+Z`| Global | Redo last undone action |
| `Ctrl + X` | Active Selection | Cut selected elements to clipboard |
| `Ctrl + C` | Active Selection | Copy selected elements to clipboard |
| `Ctrl + V` | Cursor Position | Paste elements from clipboard |

---

## 🛠️ Technology Stack & Architecture

- **Core Framework:** React 19 with strict TypeScript
- **Styling & UI:** Tailwind CSS v4 with Lucide React icons
- **Build Tooling:** Vite 6
- **Audio Engine:** Pure Web Audio API (polyphonic acoustic synthesizer, physical acoustic modeling, noise transients, progressive vibrato, harmonic drawbars)
- **Rendering Engine:** Custom mathematical SVG vector renderer

---

## 💻 Getting Started

### 🌐 Direct Browser Access
Note-ation runs 100% in your browser without requiring any software installation:
👉 **[Open Note-ation](https://monzenn.github.io/Note-ationWeb/)**

### 🛠️ Local Development Setup

#### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

#### Installation & Development
```bash
# Clone repository
git clone https://github.com/MonZenn/Note-ationWeb.git
cd Note-ationWeb

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### Building for Production
```bash
# Compile TypeScript and bundle with Vite
npm run build

# Preview production build locally
npm run preview
```

---

## 📄 License & Legal Disclaimers

### Author & Copyright
**Note-ation** is an independent, original open-source software project created and maintained by **Ramon John L. Dela Cruz**.

Copyright (c) 2026 Ramon John L. Dela Cruz.

### MIT License
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

### Disclaimer of Warranties & Limitation of Liability
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Trademark & Independent Origin Notice
Note-ation is an independent open-source software application built from the ground up using modern web technologies. Any musical conventions, terminology, standard musical glyphs, or universal notation rules implemented within this software represent standard music engraving practices. All product names, logos, and brands mentioned or referenced herein are property of their respective owners.
