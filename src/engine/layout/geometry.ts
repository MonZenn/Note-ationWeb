import {
  MusicElement,
  NoteElement,
  RestElement,
  TimeSignatureElement,
  ClefType,
  PageSetupConfig,
  ScoreFontsConfig,
  FontSetting,
} from '../../types/score';

export const KEY_SIGNATURE_OFFSETS: Record<ClefType, { sharps: number[]; flats: number[] }> = {
  treble: {
    // Sharps: F5, C5, G5, D5, A4, E5, B4
    sharps: [4, 1, 5, 2, -1, 3, 0],
    // Flats:  B4, E5, A4, D5, G4, C5, F4
    flats:  [0, 3, -1, 2, -2, 1, -3],
  },
  bass: {
    // Sharps: F4, C4, G4, D4, A3, E4, B3
    sharps: [2, -1, 3, 0, -3, 1, -2],
    // Flats:  B3, E4, A3, D4, G3, C4, F3
    flats:  [-2, 1, -3, 0, -4, -1, -5],
  },
  alto: {
    // Sharps: F5, C5, G5, D5, A4, E4, B4
    sharps: [3, 0, 4, 1, -2, 2, -1],
    // Flats:  B4, E4, A4, D4, G4, C4, F4
    flats:  [-1, 2, -2, 1, -3, 0, -4],
  },
  tenor: {
    // Sharps: F4, C4, G4, D4, A3, E4, B3
    sharps: [1, 5, 2, 6, 3, 0, 4],
    // Flats:  B3, E4, A3, D4, G3, C4, F3
    flats:  [1, 4, 0, 3, -1, 2, -2],
  },
};

export const DEFAULT_PAGE_SETUP: PageSetupConfig = {
  staffScale: 0.75,
  staffSpacing: 45,
  systemSpacing: 55,
  margins: {
    topMm: 12,
    bottomMm: 12,
    leftMm: 12,
    rightMm: 12,
  },
};

export const DEFAULT_SCORE_FONTS: ScoreFontsConfig = {
  title: { family: 'Georgia', sizePt: 24, bold: true },
  subtitle: { family: 'Georgia', sizePt: 14, italic: true },
  composer: { family: 'Georgia', sizePt: 12, bold: true },
  lyricist: { family: 'Georgia', sizePt: 11, italic: true },
  staffLyrics: { family: 'Times New Roman', sizePt: 11 },
  measureNumbers: { family: 'Georgia', sizePt: 10, bold: true },
  pageNumbers: { family: 'Georgia', sizePt: 10 },
  chordsAndText: { family: 'Arial', sizePt: 12, bold: true },
  staffLabels: { family: 'Georgia', sizePt: 11, bold: true },
};

export function resolvePageSetup(
  pageSetup?: Partial<PageSetupConfig> | { staffScale?: number; staffSpacing?: number; systemSpacing?: number; margins?: Partial<PageSetupConfig['margins']> }
): PageSetupConfig {
  const p = pageSetup || {};
  const rawScale = p.staffScale ?? DEFAULT_PAGE_SETUP.staffScale;
  const staffScale = Number.isFinite(rawScale)
    ? Math.max(0.25, Math.min(3.0, rawScale))
    : DEFAULT_PAGE_SETUP.staffScale;

  const validateNonNegative = (val: unknown, defaultVal: number): number => {
    return typeof val === 'number' && Number.isFinite(val) && val >= 0 ? val : defaultVal;
  };

  const staffSpacing = validateNonNegative(p.staffSpacing, DEFAULT_PAGE_SETUP.staffSpacing);
  const systemSpacing = validateNonNegative(p.systemSpacing, DEFAULT_PAGE_SETUP.systemSpacing);

  const m = p.margins || {};
  const margins = {
    topMm: validateNonNegative(m.topMm, DEFAULT_PAGE_SETUP.margins.topMm),
    bottomMm: validateNonNegative(m.bottomMm, DEFAULT_PAGE_SETUP.margins.bottomMm),
    leftMm: validateNonNegative(m.leftMm, DEFAULT_PAGE_SETUP.margins.leftMm),
    rightMm: validateNonNegative(m.rightMm, DEFAULT_PAGE_SETUP.margins.rightMm),
  };

  return {
    staffScale,
    staffSpacing,
    systemSpacing,
    margins,
  };
}

export function resolveScoreFonts(
  fonts?: Partial<ScoreFontsConfig> | { [K in keyof ScoreFontsConfig]?: Partial<FontSetting> }
): ScoreFontsConfig {
  const f = fonts || {};
  return {
    title: { ...DEFAULT_SCORE_FONTS.title, ...(f.title || {}) },
    subtitle: { ...DEFAULT_SCORE_FONTS.subtitle, ...(f.subtitle || {}) },
    composer: { ...DEFAULT_SCORE_FONTS.composer, ...(f.composer || {}) },
    lyricist: { ...DEFAULT_SCORE_FONTS.lyricist, ...(f.lyricist || {}) },
    staffLyrics: { ...DEFAULT_SCORE_FONTS.staffLyrics, ...(f.staffLyrics || {}) },
    measureNumbers: { ...DEFAULT_SCORE_FONTS.measureNumbers, ...(f.measureNumbers || {}) },
    pageNumbers: { ...DEFAULT_SCORE_FONTS.pageNumbers, ...(f.pageNumbers || {}) },
    chordsAndText: { ...DEFAULT_SCORE_FONTS.chordsAndText, ...(f.chordsAndText || {}) },
    staffLabels: { ...DEFAULT_SCORE_FONTS.staffLabels, ...(f.staffLabels || {}) },
  };
}

export const MM_TO_PX = 96 / 25.4;
export const STAFF_LINE_SPACING = 10;
export const STAFF_HALF_SPACING = STAFF_LINE_SPACING / 2; // 5px
export const STAFF_HEIGHT = STAFF_LINE_SPACING * 4; // 40px
export const STAFF_START_X = 80;

export function calculatePitchY(centerLineY: number, diatonicOffset: number, scale: number = 1.0): number {
  return centerLineY - (diatonicOffset * (STAFF_HALF_SPACING * scale));
}

export function calculateLedgerLines(diatonicOffset: number): number[] {
  const ledgers: number[] = [];
  if (diatonicOffset >= 6) {
    const maxEven = diatonicOffset % 2 === 0 ? diatonicOffset : diatonicOffset - 1;
    for (let step = 6; step <= maxEven; step += 2) {
      ledgers.push(step);
    }
  } else if (diatonicOffset <= -6) {
    const minEven = diatonicOffset % 2 === 0 ? diatonicOffset : diatonicOffset + 1;
    for (let step = -6; step >= minEven; step -= 2) {
      ledgers.push(step);
    }
  }
  return ledgers;
}

export function getElementWidth(element: MusicElement, lyricToken?: string, scale: number = 1.0): number {
  let baseWidth = 36;
  switch (element.type) {
    case 'bar':
    case 'volta':
      baseWidth = 24;
      break;
    case 'flow':
      if (element.mark === 'segno' || element.mark === 'coda') baseWidth = 24;
      else if (element.mark === 'fine') baseWidth = 32;
      else if (element.mark === 'to-coda') baseWidth = 60;
      else baseWidth = 65;
      break;
    case 'dynamic':
      if (element.mark === 'p' || element.mark === 'f') baseWidth = 24;
      else if (element.mark === 'pp' || element.mark === 'ff' || element.mark === 'mp' || element.mark === 'mf' || element.mark === 'fz') baseWidth = 30;
      else baseWidth = 36;
      break;
    case 'clef':
      baseWidth = 40;
      break;
    case 'time':
      baseWidth = 36;
      break;
    case 'key': {
      const activeCount = Math.abs(element.accidentalsCount);
      const cancelCount =
        element.cancelIndices && element.cancelIndices.length > 0
          ? element.cancelIndices.length
          : element.cancelCount || 0;
      const totalSymbols = activeCount + cancelCount;
      if (totalSymbols === 0) {
        baseWidth = 28;
      } else {
        baseWidth = Math.max(30, totalSymbols * 10 + 10);
      }
      break;
    }
    case 'note':
    case 'rest':
      baseWidth = 36 + (element.dots > 0 ? 12 : 0);
      break;
    case 'text':
      if (element.category === 'chord') {
        baseWidth = Math.max(28, element.text.length * 9 + 8);
      } else if (element.category === 'part') {
        baseWidth = Math.max(36, element.text.length * 8 + 16);
      } else {
        baseWidth = Math.max(28, element.text.length * 8 + 8);
      }
      break;
    case 'tempo': {
      const mode = element.displayMode || (element.text ? 'text-and-metronome' : 'metronome-only');
      const textLen = (element.text || '').length;
      if (mode === 'text-only') {
        baseWidth = Math.max(36, textLen * 8 + 12);
      } else if (mode === 'metronome-only') {
        baseWidth = 50;
      } else {
        baseWidth = Math.max(60, textLen * 8 + 58);
      }
      break;
    }
    default:
      baseWidth = 36;
      break;
  }

  // Dynamic layout width expansion for lyrics on notes and rests
  if (element.type === 'note' || element.type === 'rest') {
    const lyric = lyricToken !== undefined ? lyricToken : element.lyric;
    if (lyric && lyric !== '_') {
      const textOnly = lyric === '-' ? '-' : lyric.endsWith('-') ? lyric.slice(0, -1) : lyric;
      const neededWidth = Math.ceil(textOnly.length * 7.5 + 14);
      if (neededWidth > baseWidth) {
        baseWidth = neededWidth;
      }
    }
  }

  return Math.round(baseWidth * scale);
}

export function computeElementBeatDuration(element: MusicElement): number {
  if (element.type === 'text') {
    return 0;
  }
  if (element.type === 'note' || element.type === 'rest') {
    const baseBeats = 4 / element.duration;
    let dotMultiplier = 1;
    if (element.dots === 1) dotMultiplier = 1.5;
    else if (element.dots === 2) dotMultiplier = 1.75;
    else if (element.dots > 2) dotMultiplier = 2 - Math.pow(0.5, element.dots);

    return baseBeats * dotMultiplier;
  }
  return 0;
}

export function getEffectiveStemDirection(
  note: NoteElement,
  voice?: 'voice-1' | 'voice-2'
): 'up' | 'down' {
  if (note.stemDirection && note.stemDirection !== 'auto') {
    return note.stemDirection;
  }
  if (voice === 'voice-1') return 'up';
  if (voice === 'voice-2') return 'down';

  if (!note.pitches || note.pitches.length === 0) {
    return 'up';
  }
  if (note.pitches.length === 1) {
    return note.pitches[0].diatonicOffset >= 0 ? 'down' : 'up';
  }
  const offsets = note.pitches.map((p) => p.diatonicOffset);
  const minOffset = Math.min(...offsets);
  const maxOffset = Math.max(...offsets);
  const maxAbs = Math.abs(maxOffset);
  const minAbs = Math.abs(minOffset);
  if (maxAbs === minAbs) {
    if (maxOffset === minOffset) {
      return maxOffset >= 0 ? 'down' : 'up';
    }
    return 'down';
  }
  const furthestOffset = maxAbs > minAbs ? maxOffset : minOffset;
  return furthestOffset >= 0 ? 'down' : 'up';
}

export interface SlurGeometry {
  path: string;
  direction: 'above' | 'below';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  apexY: number;
}

export function computeSlurGeometry(
  startNote: NoteElement,
  endNote: NoteElement,
  elementsWithPositions: { element: MusicElement; x: number; width?: number }[],
  centerY: number,
  scale: number = 1.0,
  voice?: 'voice-1' | 'voice-2'
): SlurGeometry | null {
  const startIdx = elementsWithPositions.findIndex((e) => e.element.id === startNote.id);
  const endIdx = elementsWithPositions.findIndex((e) => e.element.id === endNote.id);
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
    return null;
  }

  const startElemPos = elementsWithPositions[startIdx];
  const endElemPos = elementsWithPositions[endIdx];
  const span = elementsWithPositions.slice(startIdx, endIdx + 1);

  // Direction determination
  let effectiveDir: 'above' | 'below' = 'above';
  if (startNote.slur?.direction === 'above' || startNote.slur?.direction === 'below') {
    effectiveDir = startNote.slur.direction;
  } else if (voice === 'voice-2') {
    effectiveDir = 'below';
  } else if (voice === 'voice-1') {
    effectiveDir = 'above';
  } else {
    const notesInSpan = span
      .map((s) => s.element)
      .filter((e): e is NoteElement => e.type === 'note');
    const allStemsUp = notesInSpan.length > 0 && notesInSpan.every((n) => getEffectiveStemDirection(n, voice) === 'up');
    effectiveDir = allStemsUp ? 'below' : 'above';
  }

  const getNotePitchBounds = (note: NoteElement) => {
    if (!note.pitches || note.pitches.length === 0) {
      return { topY: centerY, bottomY: centerY };
    }
    const ys = note.pitches.map((p) => calculatePitchY(centerY, p.diatonicOffset, scale));
    return {
      topY: Math.min(...ys),
      bottomY: Math.max(...ys),
    };
  };

  const startBounds = getNotePitchBounds(startNote);
  const endBounds = getNotePitchBounds(endNote);

  let startAnchorX: number;
  let startAnchorY: number;
  let endAnchorX: number;
  let endAnchorY: number;

  if (effectiveDir === 'below') {
    if (getEffectiveStemDirection(startNote, voice) === 'down') {
      startAnchorX = startElemPos.x + 1.5;
      startAnchorY = startBounds.bottomY + 32 * scale + 4 * scale;
    } else {
      startAnchorX = startElemPos.x + 7;
      startAnchorY = startBounds.bottomY + 8 * scale;
    }

    if (getEffectiveStemDirection(endNote, voice) === 'down') {
      endAnchorX = endElemPos.x + 1.5;
      endAnchorY = endBounds.bottomY + 32 * scale + 4 * scale;
    } else {
      endAnchorX = endElemPos.x + 7;
      endAnchorY = endBounds.bottomY + 8 * scale;
    }
  } else {
    // Curving above
    if (getEffectiveStemDirection(startNote, voice) === 'up') {
      startAnchorX = startElemPos.x + 12.5;
      startAnchorY = startBounds.topY - 32 * scale - 4 * scale;
    } else {
      startAnchorX = startElemPos.x + 7;
      startAnchorY = startBounds.topY - 8 * scale;
    }

    if (getEffectiveStemDirection(endNote, voice) === 'up') {
      endAnchorX = endElemPos.x + 12.5;
      endAnchorY = endBounds.topY - 32 * scale - 4 * scale;
    } else {
      endAnchorX = endElemPos.x + 7;
      endAnchorY = endBounds.topY - 8 * scale;
    }
  }

  let apexY: number;
  const dx = endAnchorX - startAnchorX;
  const naturalBow = Math.max(12, Math.min(28, dx * 0.15));

  if (effectiveDir === 'below') {
    let maxY = Math.max(startAnchorY, endAnchorY);
    for (const item of span) {
      if (item.element.type === 'note') {
        const bounds = getNotePitchBounds(item.element);
        if (getEffectiveStemDirection(item.element, voice) === 'down') {
          maxY = Math.max(maxY, bounds.bottomY + 32 * scale);
        } else {
          maxY = Math.max(maxY, bounds.bottomY);
        }
      }
    }
    apexY = Math.max(maxY + 10, Math.max(startAnchorY, endAnchorY) + naturalBow);
  } else {
    let minY = Math.min(startAnchorY, endAnchorY);
    for (const item of span) {
      if (item.element.type === 'note') {
        const bounds = getNotePitchBounds(item.element);
        if (getEffectiveStemDirection(item.element, voice) === 'up') {
          minY = Math.min(minY, bounds.topY - 32 * scale);
        } else {
          minY = Math.min(minY, bounds.topY);
        }
      }
    }
    apexY = Math.min(minY - 10, Math.min(startAnchorY, endAnchorY) - naturalBow);
  }

  const cp1X = Number((startAnchorX + dx * 0.32).toFixed(2));
  const cp2X = Number((endAnchorX - dx * 0.32).toFixed(2));
  const path = `M ${startAnchorX} ${startAnchorY} C ${cp1X} ${apexY}, ${cp2X} ${apexY}, ${endAnchorX} ${endAnchorY}`;

  return {
    path,
    direction: effectiveDir,
    startX: startAnchorX,
    startY: startAnchorY,
    endX: endAnchorX,
    endY: endAnchorY,
    apexY,
  };
}

export interface BeamedGroup {
  notes: NoteElement[];
  noteIndices: number[];
  stemDirection: 'up' | 'down';
}

export interface BeamPolygon {
  points: string;
  type: 'primary' | 'secondary' | 'tertiary';
  isStub?: boolean;
}

export interface BeamedGroupGeometry {
  stemDirection: 'up' | 'down';
  notes: {
    note: NoteElement;
    elementIndex: number;
    stemX: number;
    stemTipY: number;
    beamY: number;
  }[];
  polygons: BeamPolygon[];
}

function getElementQuarterDuration(elem: MusicElement): number {
  if (elem.type === 'note' || elem.type === 'rest') {
    const base = 4 / elem.duration;
    if (elem.dots === 1) return base * 1.5;
    if (elem.dots === 2) return base * 1.75;
    return base;
  }
  return 0;
}

function determineGroupStemDirection(notes: NoteElement[], voice?: 'voice-1' | 'voice-2'): 'up' | 'down' {
  // If any note has explicit stem direction, check if an explicit preference exists
  const explicit = notes.find((n) => n.stemDirection && n.stemDirection !== 'auto');
  if (explicit && explicit.stemDirection !== 'auto') {
    return explicit.stemDirection;
  }

  if (voice === 'voice-1') return 'up';
  if (voice === 'voice-2') return 'down';

  let maxAbs = -1;
  let furthestOffset = 0;

  for (const note of notes) {
    if (!note.pitches || note.pitches.length === 0) continue;
    for (const p of note.pitches) {
      const abs = Math.abs(p.diatonicOffset);
      if (abs > maxAbs) {
        maxAbs = abs;
        furthestOffset = p.diatonicOffset;
      } else if (abs === maxAbs) {
        // In case of tie, favor downward stemming (convention)
        if (p.diatonicOffset >= 0) {
          furthestOffset = p.diatonicOffset;
        }
      }
    }
  }

  return furthestOffset >= 0 ? 'down' : 'up';
}

export function computeBeamedGroups(
  elements: MusicElement[],
  timeSig?: TimeSignatureElement,
  voice?: 'voice-1' | 'voice-2',
  autoBeaming: boolean = true
): BeamedGroup[] {
  let curNum = 4;
  let curDen = 4;

  if (timeSig) {
    if (timeSig.symbol === 'cut') {
      curNum = 2;
      curDen = 2;
    } else if (timeSig.symbol === 'common') {
      curNum = 4;
      curDen = 4;
    } else {
      curNum = timeSig.numerator;
      curDen = timeSig.denominator;
    }
  }

  const isCompound = curDen === 8 && curNum % 3 === 0;
  const pulseDuration = isCompound ? 1.5 : curDen === 2 ? 2.0 : curDen === 8 ? 0.5 : 1.0;

  let currentMeasureTime = 0;
  let activeGroup: { note: NoteElement; index: number; startTime: number; endTime: number }[] = [];
  const resultGroups: BeamedGroup[] = [];

  const flushActiveGroup = () => {
    if (activeGroup.length >= 2) {
      const notes = activeGroup.map((g) => g.note);
      const noteIndices = activeGroup.map((g) => g.index);
      const stemDirection = determineGroupStemDirection(notes, voice);
      resultGroups.push({ notes, noteIndices, stemDirection });
    }
    activeGroup = [];
  };

  for (let elemIdx = 0; elemIdx < elements.length; elemIdx++) {
    const elem = elements[elemIdx];

    if (elem.type === 'time') {
      flushActiveGroup();
      if (elem.symbol === 'cut') {
        curNum = 2;
        curDen = 2;
      } else if (elem.symbol === 'common') {
        curNum = 4;
        curDen = 4;
      } else {
        curNum = elem.numerator;
        curDen = elem.denominator;
      }
      continue;
    }

    if (elem.type === 'bar') {
      flushActiveGroup();
      currentMeasureTime = 0;
      continue;
    }

    if (elem.type === 'rest') {
      flushActiveGroup();
      currentMeasureTime += getElementQuarterDuration(elem);
      continue;
    }

    if (elem.type !== 'note') {
      flushActiveGroup();
      continue;
    }

    // Now elem is a NoteElement
    const dur = getElementQuarterDuration(elem);
    const noteStartTime = currentMeasureTime;
    const noteEndTime = currentMeasureTime + dur;
    currentMeasureTime = noteEndTime;

    // Durations larger than eighth notes (> 8 means quarter, half, whole) cannot be beamed
    if (elem.duration < 8) {
      flushActiveGroup();
      continue;
    }

    if (activeGroup.length === 0) {
      activeGroup.push({ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime });
      continue;
    }

    // Checking whether elem can join activeGroup
    const prev = activeGroup[activeGroup.length - 1];

    if (elem.beam === 'break') {
      flushActiveGroup();
      activeGroup = [{ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime }];
      continue;
    }

    if (prev.note.beam === 'join' || elem.beam === 'join') {
      activeGroup.push({ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime });
      continue;
    }

    if (!autoBeaming) {
      flushActiveGroup();
      activeGroup = [{ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime }];
      continue;
    }

    const groupStart = activeGroup[0].startTime;

    if (isCompound) {
      const pulseStart = Math.floor(groupStart / pulseDuration + 1e-6);
      const pulseCur = Math.floor(noteStartTime / pulseDuration + 1e-6);
      if (pulseStart === pulseCur) {
        activeGroup.push({ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime });
      } else {
        flushActiveGroup();
        activeGroup = [{ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime }];
      }
    } else if (curNum === 4 && curDen === 4) {
      // 4/4 meter: cannot cross half-measure divide at beat 2.0
      const crossesHalf = groupStart < 2.0 - 1e-5 && noteStartTime >= 2.0 - 1e-5;
      if (crossesHalf) {
        flushActiveGroup();
        activeGroup = [{ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime }];
        continue;
      }

      // If any note has duration >= 16 (16th or 32nd), beam by quarter beat
      const hasSub16th = activeGroup.some((g) => g.note.duration >= 16) || elem.duration >= 16;
      if (hasSub16th) {
        const beatStart = Math.floor(groupStart + 1e-6);
        const beatCur = Math.floor(noteStartTime + 1e-6);
        if (beatStart !== beatCur) {
          flushActiveGroup();
          activeGroup = [{ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime }];
          continue;
        }
      }

      activeGroup.push({ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime });
    } else if (curNum === 3 && curDen === 4) {
      // 3/4 meter: beam by individual quarter-note beat
      const beatStart = Math.floor(groupStart + 1e-6);
      const beatCur = Math.floor(noteStartTime + 1e-6);
      if (beatStart === beatCur) {
        activeGroup.push({ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime });
      } else {
        flushActiveGroup();
        activeGroup = [{ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime }];
      }
    } else {
      // 2/4 and other meters:
      const hasSub16th = activeGroup.some((g) => g.note.duration >= 16) || elem.duration >= 16;
      if (hasSub16th) {
        const beatStart = Math.floor(groupStart / pulseDuration + 1e-6);
        const beatCur = Math.floor(noteStartTime / pulseDuration + 1e-6);
        if (beatStart !== beatCur) {
          flushActiveGroup();
          activeGroup = [{ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime }];
          continue;
        }
      }
      activeGroup.push({ note: elem, index: elemIdx, startTime: noteStartTime, endTime: noteEndTime });
    }
  }

  flushActiveGroup();
  return resultGroups;
}

export function computeStaffBeams(
  elementsWithPositions: { element: MusicElement; x: number; width?: number }[],
  centerY: number,
  timeSig?: TimeSignatureElement,
  scale: number = 1.0,
  voice?: 'voice-1' | 'voice-2',
  autoBeaming: boolean = true
): BeamedGroupGeometry[] {
  const elements = elementsWithPositions.map((e) => e.element);
  const groups = computeBeamedGroups(elements, timeSig, voice, autoBeaming);
  const beamedGeometries: BeamedGroupGeometry[] = [];

  for (const group of groups) {
    const groupNotesData: {
      note: NoteElement;
      elementIndex: number;
      stemX: number;
      defaultTipY: number;
      noteheadY: number;
    }[] = [];

    for (let i = 0; i < group.notes.length; i++) {
      const note = group.notes[i];
      const elemIdx = group.noteIndices[i];
      const pos = elementsWithPositions[elemIdx];
      if (!pos) continue;

      const stemOffset = (group.stemDirection === 'up' ? 12.5 : 1.5) * scale;
      const stemX = Number((pos.x + stemOffset).toFixed(2));
      const offsets = note.pitches && note.pitches.length > 0
        ? note.pitches.map((p) => p.diatonicOffset)
        : [0];
      const topPitchY = calculatePitchY(centerY, Math.max(...offsets), scale);
      const bottomPitchY = calculatePitchY(centerY, Math.min(...offsets), scale);

      const stemLen = (voice === 'voice-2' ? 28 : 32) * scale;
      const minDownTipY = centerY + (voice === 'voice-2' ? 16 : 8) * scale;
      const maxUpTipY = centerY - (voice === 'voice-2' ? 16 : 8) * scale;

      const defaultTipY = group.stemDirection === 'up'
        ? Math.min(topPitchY - stemLen, maxUpTipY)
        : Math.max(bottomPitchY + stemLen, minDownTipY);
      const noteheadY = group.stemDirection === 'up' ? bottomPitchY : topPitchY;

      groupNotesData.push({
        note,
        elementIndex: elemIdx,
        stemX,
        defaultTipY,
        noteheadY,
      });
    }

    if (groupNotesData.length < 2) continue;

    const first = groupNotesData[0];
    const last = groupNotesData[groupNotesData.length - 1];
    const dx = last.stemX - first.stemX;
    const rawSlope = dx !== 0 ? (last.defaultTipY - first.defaultTipY) / dx : 0;
    const clampedSlope = Math.max(-0.15, Math.min(0.15, rawSlope));

    // Linear equation: y(x) = first.defaultTipY + clampedSlope * (x - first.stemX)
    const lineY = (x: number) => first.defaultTipY + clampedSlope * (x - first.stemX);

    // Clearance adjustment: intermediate stems must not be truncated below minimum length
    let deltaY = 0;
    if (group.stemDirection === 'up') {
      deltaY = Math.min(0, ...groupNotesData.map((d) => d.defaultTipY - lineY(d.stemX)));
    } else {
      deltaY = Math.max(0, ...groupNotesData.map((d) => d.defaultTipY - lineY(d.stemX)));
    }

    const beamYAt = (x: number) => Number((lineY(x) + deltaY).toFixed(2));

    const notesWithBeam = groupNotesData.map((d) => ({
      note: d.note,
      elementIndex: d.elementIndex,
      stemX: d.stemX,
      stemTipY: beamYAt(d.stemX),
      beamY: beamYAt(d.stemX),
    }));

    // Generate beam polygons
    const polygons: BeamPolygon[] = [];
    const dirSign = group.stemDirection === 'up' ? 1 : -1;
    const beamThickness = 2.0 * scale;
    const beamSpacing = 2.0 * scale;
    const step = beamThickness + beamSpacing; // 4.0 * scale px

    // 1. Primary Beam (connects all notes in group)
    const x0 = notesWithBeam[0].stemX;
    const y0 = beamYAt(x0);
    const xN = notesWithBeam[notesWithBeam.length - 1].stemX;
    const yN = beamYAt(xN);

    const p1Points = `${x0},${y0} ${xN},${yN} ${xN},${Number((yN + dirSign * beamThickness).toFixed(2))} ${x0},${Number((y0 + dirSign * beamThickness).toFixed(2))}`;
    polygons.push({ type: 'primary', points: p1Points });

    // 2. Secondary Beams (for duration >= 16: 16th and 32nd notes)
    const secOffset = dirSign * step;
    let secRunStart: number | null = null;

    for (let i = 0; i < notesWithBeam.length; i++) {
      const is16 = notesWithBeam[i].note.duration >= 16;
      if (is16) {
        if (secRunStart === null) secRunStart = i;
      } else {
        if (secRunStart !== null) {
          addSecondaryOrTertiarySpan(secRunStart, i - 1, 'secondary', secOffset);
          secRunStart = null;
        }
      }
    }
    if (secRunStart !== null) {
      addSecondaryOrTertiarySpan(secRunStart, notesWithBeam.length - 1, 'secondary', secOffset);
    }

    // 3. Tertiary Beams (for duration >= 32)
    const tertOffset = dirSign * (step * 2);
    let tertRunStart: number | null = null;

    for (let i = 0; i < notesWithBeam.length; i++) {
      const is32 = notesWithBeam[i].note.duration >= 32;
      if (is32) {
        if (tertRunStart === null) tertRunStart = i;
      } else {
        if (tertRunStart !== null) {
          addSecondaryOrTertiarySpan(tertRunStart, i - 1, 'tertiary', tertOffset);
          tertRunStart = null;
        }
      }
    }
    if (tertRunStart !== null) {
      addSecondaryOrTertiarySpan(tertRunStart, notesWithBeam.length - 1, 'tertiary', tertOffset);
    }

    function addSecondaryOrTertiarySpan(
      startIdx: number,
      endIdx: number,
      type: 'secondary' | 'tertiary',
      offsetY: number
    ) {
      if (startIdx < endIdx) {
        // Continuous beam across multiple notes
        const startX = notesWithBeam[startIdx].stemX;
        const endX = notesWithBeam[endIdx].stemX;
        const startY = beamYAt(startX) + offsetY;
        const endY = beamYAt(endX) + offsetY;
        const pts = `${startX},${startY} ${endX},${endY} ${endX},${Number((endY + dirSign * beamThickness).toFixed(2))} ${startX},${Number((startY + dirSign * beamThickness).toFixed(2))}`;
        polygons.push({ type, points: pts });
      } else {
        // Isolated single note -> bounded fractional stub
        const curX = notesWithBeam[startIdx].stemX;
        const maxStub = 8 * scale;
        let stubStartX: number;
        let stubEndX: number;

        if (startIdx === 0) {
          // At start of group: point right towards next note
          const distNext = notesWithBeam.length > 1 ? notesWithBeam[1].stemX - curX : maxStub;
          const stubLen = Math.min(maxStub, Math.max(4, distNext * 0.4));
          stubStartX = curX;
          stubEndX = curX + stubLen;
        } else if (startIdx === notesWithBeam.length - 1) {
          // At end of group: point left towards previous note
          const distPrev = startIdx > 0 ? curX - notesWithBeam[startIdx - 1].stemX : maxStub;
          const stubLen = Math.min(maxStub, Math.max(4, distPrev * 0.4));
          stubStartX = curX - stubLen;
          stubEndX = curX;
        } else {
          // Middle of group: if preceding note is dotted, point left; else right
          const prevDotted = notesWithBeam[startIdx - 1].note.dots > 0;
          if (prevDotted) {
            const distPrev = curX - notesWithBeam[startIdx - 1].stemX;
            const stubLen = Math.min(maxStub, Math.max(4, distPrev * 0.4));
            stubStartX = curX - stubLen;
            stubEndX = curX;
          } else {
            const distNext = notesWithBeam[startIdx + 1].stemX - curX;
            const stubLen = Math.min(maxStub, Math.max(4, distNext * 0.4));
            stubStartX = curX;
            stubEndX = curX + stubLen;
          }
        }

        const startY = beamYAt(stubStartX) + offsetY;
        const endY = beamYAt(stubEndX) + offsetY;
        const pts = `${stubStartX},${startY} ${stubEndX},${endY} ${stubEndX},${Number((endY + dirSign * beamThickness).toFixed(2))} ${stubStartX},${Number((startY + dirSign * beamThickness).toFixed(2))}`;
        polygons.push({ type, points: pts, isStub: true });
      }
    }

    beamedGeometries.push({
      stemDirection: group.stemDirection,
      notes: notesWithBeam,
      polygons,
    });
  }

  return beamedGeometries;
}

export interface LyricSyllableLayout {
  verseIndex: number;
  elementId: string;
  text: string;
  x: number;
  y: number;
}

export interface LyricHyphenLayout {
  verseIndex: number;
  x: number;
  y: number;
}

export interface StaffLyricsLayout {
  syllables: LyricSyllableLayout[];
  hyphens: LyricHyphenLayout[];
}

export function getElementVisualCenterX(element: MusicElement, elemX: number): number {
  if (element.type === 'note') {
    return elemX + 7;
  }
  if (element.type === 'rest') {
    return elemX + (element.duration <= 2 ? 10 : 9);
  }
  return elemX + 7;
}

export function computeStaffLyricsLayout(
  elements: MusicElement[],
  lyrics: string[],
  elemPositions: { element: MusicElement; x: number; width?: number }[],
  centerY: number,
  verses?: string[][],
  fullStaffElements?: MusicElement[],
  scale: number = 1.0
): StaffLyricsLayout {
  const versesToProcess: string[][] =
    verses && verses.length > 0 ? verses : lyrics && lyrics.length > 0 ? [lyrics] : [];

  if (versesToProcess.length === 0 || elements.length === 0) {
    return { syllables: [], hyphens: [] };
  }

  // Calculate dynamic vertical baseline
  const noteElements = elements.filter((e): e is NoteElement => e.type === 'note');
  const allPitchYs = noteElements.flatMap((n) =>
    (n.pitches || []).map((p) => calculatePitchY(centerY, p.diatonicOffset, scale))
  );
  const lowestPitchY = allPitchYs.length > 0 ? Math.max(...allPitchYs) : -Infinity;

  const hasDynamics = elements.some((e) => e.type === 'dynamic');
  const lowestDynamicY = hasDynamics ? centerY + 34 * scale : -Infinity;

  const baseBaselineY = Math.max(
    centerY + 38 * scale,
    lowestPitchY !== -Infinity ? lowestPitchY + 18 * scale : -Infinity,
    lowestDynamicY !== -Infinity ? lowestDynamicY + 16 * scale : -Infinity
  );

  const rhythmElements = elements.filter(
    (e): e is NoteElement | RestElement => e.type === 'note' || e.type === 'rest'
  );

  const globalRhythmElements = (fullStaffElements || elements).filter(
    (e): e is NoteElement | RestElement => e.type === 'note' || e.type === 'rest'
  );

  const syllables: LyricSyllableLayout[] = [];
  const hyphens: LyricHyphenLayout[] = [];

  for (let vIdx = 0; vIdx < versesToProcess.length; vIdx++) {
    const verseBaselineY = baseBaselineY + vIdx * (15 * scale);
    const tokens = versesToProcess[vIdx] || [];
    let pendingHyphen: { midX: number; verseIndex: number; nextExpectedId?: string } | null = null;

    for (let i = 0; i < rhythmElements.length; i++) {
      const elem = rhythmElements[i];
      const globalIdx = globalRhythmElements.findIndex((ge) => ge.id === elem.id);
      const tokenIdx = globalIdx !== -1 ? globalIdx : i;
      const token = tokenIdx < tokens.length ? tokens[tokenIdx] : undefined;

      const pos = elemPositions.find((p) => p.element.id === elem.id);
      const elemX = pos ? pos.x : 0;
      const midX = getElementVisualCenterX(elem, elemX);

      if (token === '-') {
        pendingHyphen = null;
      } else if (pendingHyphen) {
        if (!pendingHyphen.nextExpectedId || pendingHyphen.nextExpectedId === elem.id) {
          const dist = midX - pendingHyphen.midX;
          if (dist >= 24 * scale) {
            hyphens.push({
              verseIndex: pendingHyphen.verseIndex,
              x: (pendingHyphen.midX + midX) / 2,
              y: verseBaselineY,
            });
          }
        }
        pendingHyphen = null;
      }

      if (!token || token === '_') {
        continue;
      }

      let text = token;
      if (token === '-') {
        text = '-';
      } else if (token.endsWith('-')) {
        text = token.slice(0, -1);
        const nextGlobalElem =
          globalIdx !== -1 && globalIdx + 1 < globalRhythmElements.length
            ? globalRhythmElements[globalIdx + 1]
            : undefined;
        pendingHyphen = {
          midX,
          verseIndex: vIdx,
          nextExpectedId: nextGlobalElem?.id,
        };
      }

      if (text.length > 0) {
        syllables.push({
          verseIndex: vIdx,
          elementId: elem.id,
          text,
          x: midX,
          y: verseBaselineY,
        });
      }
    }
  }

  return { syllables, hyphens };
}

export function getActiveKeyAndClefAtMeasure(
  elements: MusicElement[],
  initialClef: ClefType = 'treble',
  targetMeasureIndex: number = 0
): { clef: ClefType; key: { key: string; accidentalsCount: number } } {
  let activeClef: ClefType = initialClef;
  let activeKey = { key: 'C Major', accidentalsCount: 0 };
  let currentMeasureIndex = 0;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.type === 'bar') {
      currentMeasureIndex++;
      if (currentMeasureIndex > targetMeasureIndex) {
        break;
      }
    } else if (currentMeasureIndex < targetMeasureIndex) {
      if (el.type === 'clef') {
        activeClef = el.clefType;
      } else if (el.type === 'key') {
        activeKey = { key: el.key, accidentalsCount: el.accidentalsCount };
      }
    }
  }

  // Also check leading elements if targetMeasureIndex === 0
  if (targetMeasureIndex === 0) {
    for (const el of elements) {
      if (el.type === 'clef') activeClef = el.clefType;
      else if (el.type === 'key') activeKey = { key: el.key, accidentalsCount: el.accidentalsCount };
      else if (el.type === 'bar' || el.type === 'note' || el.type === 'rest') break;
    }
  }

  return { clef: activeClef, key: activeKey };
}

export const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

export interface KeyChangeAnalysis {
  cancelledNotes: { pitch: string; offsetIndex: number; wasType: 'sharp' | 'flat' }[];
  newNotes: { pitch: string; offsetIndex: number; newType: 'sharp' | 'flat' }[];
  retainedNotes: { pitch: string; type: 'sharp' | 'flat' }[];
  cancelCount: number;
  cancelType?: 'sharp' | 'flat';
  cancelIndices: number[];
}

export function analyzeKeySignatureChange(
  fromAccidentals: number = 0,
  toAccidentals: number = 0
): KeyChangeAnalysis {
  if (fromAccidentals === toAccidentals) {
    const isSharp = toAccidentals > 0;
    const isFlat = toAccidentals < 0;
    const count = Math.abs(toAccidentals);
    const order = isSharp ? SHARP_ORDER : isFlat ? FLAT_ORDER : [];
    return {
      cancelledNotes: [],
      newNotes: [],
      retainedNotes: order.slice(0, count).map((p) => ({ pitch: p, type: isSharp ? 'sharp' : 'flat' })),
      cancelCount: 0,
      cancelIndices: [],
    };
  }

  // Old key had sharps
  if (fromAccidentals > 0) {
    const oldSharps = SHARP_ORDER.slice(0, fromAccidentals);
    if (toAccidentals > 0) {
      if (toAccidentals < fromAccidentals) {
        // Going from more sharps to fewer sharps (e.g. 3 sharps to 1 sharp):
        // Cancel the extra sharps (indices toAccidentals .. fromAccidentals - 1)
        const cancelled = SHARP_ORDER.slice(toAccidentals, fromAccidentals).map((pitch, idx) => ({
          pitch,
          offsetIndex: toAccidentals + idx,
          wasType: 'sharp' as const,
        }));
        const retained = SHARP_ORDER.slice(0, toAccidentals).map((pitch) => ({ pitch, type: 'sharp' as const }));
        return {
          cancelledNotes: cancelled,
          newNotes: [],
          retainedNotes: retained,
          cancelCount: cancelled.length,
          cancelType: 'sharp',
          cancelIndices: cancelled.map((c) => c.offsetIndex),
        };
      } else {
        // Going to more sharps: no cancellation
        const newNotes = SHARP_ORDER.slice(fromAccidentals, toAccidentals).map((pitch, idx) => ({
          pitch,
          offsetIndex: fromAccidentals + idx,
          newType: 'sharp' as const,
        }));
        const retained = SHARP_ORDER.slice(0, fromAccidentals).map((pitch) => ({ pitch, type: 'sharp' as const }));
        return {
          cancelledNotes: [],
          newNotes,
          retainedNotes: retained,
          cancelCount: 0,
          cancelIndices: [],
        };
      }
    } else if (toAccidentals < 0) {
      // Going from sharps to flats: cancel all previous sharps, add all new flats
      const cancelled = oldSharps.map((pitch, idx) => ({ pitch, offsetIndex: idx, wasType: 'sharp' as const }));
      const newFlats = FLAT_ORDER.slice(0, Math.abs(toAccidentals)).map((pitch, idx) => ({
        pitch,
        offsetIndex: idx,
        newType: 'flat' as const,
      }));
      return {
        cancelledNotes: cancelled,
        newNotes: newFlats,
        retainedNotes: [],
        cancelCount: cancelled.length,
        cancelType: 'sharp',
        cancelIndices: cancelled.map((c) => c.offsetIndex),
      };
    } else {
      // Going to C Major (0): cancel all previous sharps
      const cancelled = oldSharps.map((pitch, idx) => ({ pitch, offsetIndex: idx, wasType: 'sharp' as const }));
      return {
        cancelledNotes: cancelled,
        newNotes: [],
        retainedNotes: [],
        cancelCount: cancelled.length,
        cancelType: 'sharp',
        cancelIndices: cancelled.map((c) => c.offsetIndex),
      };
    }
  }

  // Old key had flats
  if (fromAccidentals < 0) {
    const oldFlatCount = Math.abs(fromAccidentals);
    const oldFlats = FLAT_ORDER.slice(0, oldFlatCount);
    if (toAccidentals < 0) {
      const newFlatCount = Math.abs(toAccidentals);
      if (newFlatCount < oldFlatCount) {
        // Going from more flats to fewer flats: cancel extra flats
        const cancelled = FLAT_ORDER.slice(newFlatCount, oldFlatCount).map((pitch, idx) => ({
          pitch,
          offsetIndex: newFlatCount + idx,
          wasType: 'flat' as const,
        }));
        const retained = FLAT_ORDER.slice(0, newFlatCount).map((pitch) => ({ pitch, type: 'flat' as const }));
        return {
          cancelledNotes: cancelled,
          newNotes: [],
          retainedNotes: retained,
          cancelCount: cancelled.length,
          cancelType: 'flat',
          cancelIndices: cancelled.map((c) => c.offsetIndex),
        };
      } else {
        // Going to more flats: no cancellation
        const newNotes = FLAT_ORDER.slice(oldFlatCount, newFlatCount).map((pitch, idx) => ({
          pitch,
          offsetIndex: oldFlatCount + idx,
          newType: 'flat' as const,
        }));
        const retained = FLAT_ORDER.slice(0, oldFlatCount).map((pitch) => ({ pitch, type: 'flat' as const }));
        return {
          cancelledNotes: [],
          newNotes,
          retainedNotes: retained,
          cancelCount: 0,
          cancelIndices: [],
        };
      }
    } else if (toAccidentals > 0) {
      // Going from flats to sharps: cancel all previous flats, add all new sharps
      const cancelled = oldFlats.map((pitch, idx) => ({ pitch, offsetIndex: idx, wasType: 'flat' as const }));
      const newSharps = SHARP_ORDER.slice(0, toAccidentals).map((pitch, idx) => ({
        pitch,
        offsetIndex: idx,
        newType: 'sharp' as const,
      }));
      return {
        cancelledNotes: cancelled,
        newNotes: newSharps,
        retainedNotes: [],
        cancelCount: cancelled.length,
        cancelType: 'flat',
        cancelIndices: cancelled.map((c) => c.offsetIndex),
      };
    } else {
      // Going to C Major (0): cancel all previous flats
      const cancelled = oldFlats.map((pitch, idx) => ({ pitch, offsetIndex: idx, wasType: 'flat' as const }));
      return {
        cancelledNotes: cancelled,
        newNotes: [],
        retainedNotes: [],
        cancelCount: cancelled.length,
        cancelType: 'flat',
        cancelIndices: cancelled.map((c) => c.offsetIndex),
      };
    }
  }

  // Old key was C Major (0): no cancellations, only new notes
  const isSharp = toAccidentals > 0;
  const count = Math.abs(toAccidentals);
  const order = isSharp ? SHARP_ORDER : FLAT_ORDER;
  const newNotes = order.slice(0, count).map((pitch, idx) => ({
    pitch,
    offsetIndex: idx,
    newType: isSharp ? ('sharp' as const) : ('flat' as const),
  }));

  return {
    cancelledNotes: [],
    newNotes,
    retainedNotes: [],
    cancelCount: 0,
    cancelIndices: [],
  };
}

export { computeScoreMeasureNumbers, type MeasureNumberInfo } from './measureUtils';




