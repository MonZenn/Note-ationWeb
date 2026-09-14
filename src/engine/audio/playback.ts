import { Score, MusicElement, FlowMarkType, InstrumentType, DynamicMark, NoteElement, TempoElement, TextElement, GlissandoStyle, OttavaType, TimeSignatureElement } from '../../types/score';
import { diatonicOffsetToMidi } from '../../utils/pitchUtils';
import { parseChordToMidi } from '../../utils/chordUtils';
import { playTone, stopAllGlissando } from './synth';

export const DYNAMIC_GAINS: Record<DynamicMark, number> = {
  ppp: 0.20,
  pp: 0.32,
  p: 0.45,
  mp: 0.58,
  mf: 0.72,
  f: 0.85,
  ff: 0.95,
  fff: 1.00,
  sfz: 1.00,
  fz: 0.90,
};

export const BOWED_STRING_INSTRUMENTS: Set<InstrumentType> = new Set(['violin', 'viola', 'cello']);

export function getOttavaSemitoneShift(type: OttavaType): number {
  switch (type) {
    case '8va': return 12;
    case '8vb': return -12;
    case '15ma': return 24;
    case '15mb': return -24;
  }
}

export function isBowedStringInstrument(inst?: InstrumentType | string): boolean {
  if (!inst) return false;
  const lower = inst.toLowerCase().trim();
  return lower === 'violin' || lower === 'viola' || lower === 'cello';
}

export function parseDynamicGainFromText(text: string): number | null {
  if (!text) return null;
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. Exact match with standard dynamic mark
  if (lower in DYNAMIC_GAINS) {
    return DYNAMIC_GAINS[lower as DynamicMark];
  }

  // 2. Dynamic words
  if (lower === 'forte') return DYNAMIC_GAINS.f;
  if (lower === 'piano') return DYNAMIC_GAINS.p;
  if (lower === 'pianissimo') return DYNAMIC_GAINS.pp;
  if (lower === 'fortissimo') return DYNAMIC_GAINS.ff;
  if (lower === 'mezzo forte' || lower === 'mezzo-forte') return DYNAMIC_GAINS.mf;
  if (lower === 'mezzo piano' || lower === 'mezzo-piano') return DYNAMIC_GAINS.mp;
  if (lower === 'pianississimo') return DYNAMIC_GAINS.ppp;
  if (lower === 'fortississimo') return DYNAMIC_GAINS.fff;
  if (lower === 'sforzando' || lower === 'sforzato') return DYNAMIC_GAINS.sfz;

  // 3. Isolated tokens in text (e.g. "subito f", "molto p", "meno f")
  const tokens = lower.split(/[\s,.;:]+/);
  for (const t of tokens) {
    if (t in DYNAMIC_GAINS) {
      return DYNAMIC_GAINS[t as DynamicMark];
    }
  }

  return null;
}

export function parseTempoChangeFromText(
  text: string,
  currentQuarterSec: number,
  baseScoreQuarterSec: number
): number | null {
  if (!text) return null;
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. Explicit BPM / MM format
  const bpmMatch = raw.match(/(?:bpm|tempo|mm|q|♩|\quarter)?\s*[=:]\s*(\d+(\.\d+)?)/i);
  if (bpmMatch && bpmMatch[1]) {
    const bpm = parseFloat(bpmMatch[1]);
    if (bpm >= 20 && bpm <= 400) {
      return 60 / bpm;
    }
  }

  // 2. Relative tempo shifts
  if (/\b(rit\.?|ritardando|rall\.?|rallentando|allargando|slargando)\b/i.test(lower)) {
    return currentQuarterSec * 1.25;
  }

  if (/\b(accel\.?|accelerando|affrettando|stringendo|piu mosso)\b/i.test(lower)) {
    return currentQuarterSec * 0.80;
  }

  if (/\b(a tempo|tempo primo|tempo i|in tempo)\b/i.test(lower)) {
    return baseScoreQuarterSec;
  }

  // 3. Italian tempo words
  const italianTempos: Record<string, number> = {
    grave: 40,
    largo: 46,
    lento: 52,
    larghetto: 60,
    adagio: 66,
    adagietto: 72,
    andante: 76,
    andantino: 84,
    moderato: 96,
    allegretto: 112,
    allegro: 128,
    vivace: 144,
    presto: 168,
    prestissimo: 200,
  };

  for (const [term, bpm] of Object.entries(italianTempos)) {
    const termRegex = new RegExp(`\\b${term}\\b`, 'i');
    if (termRegex.test(lower)) {
      return 60 / bpm;
    }
  }

  return null;
}

export function parseTechniqueFromText(text: string): 'pizz' | 'arco' | null {
  if (!text) return null;
  const lower = text.trim().toLowerCase();
  if (/\b(pizz\.?|pizzicato)\b/i.test(lower)) {
    return 'pizz';
  }
  if (/\b(arco|coll'arco|col arco)\b/i.test(lower)) {
    return 'arco';
  }
  return null;
}

export interface PlaybackEvent {
  staffIndex: number;
  elementIndex: number;
  midiPitches: number[];
  startTimeSec: number;
  durationSec: number;
  instrument?: InstrumentType;
  volume?: number;
  isSlurred?: boolean;
  isSlurContinuation?: boolean;
  isTiedContinuation?: boolean;
  isTrill?: boolean;
  measureIndex?: number;
  prevMidiPitches?: number[];
  isChordSymbol?: boolean;
  glissandoTargetMidi?: number;
  glissandoStyle?: GlissandoStyle;
  isTenuto?: boolean;
  isMordent?: boolean;
  isTurn?: boolean;
}

export function computeQuarterDurationSec(tempo: TempoElement): number {
  const bpm = tempo.bpm > 0 ? tempo.bpm : 120;
  const baseDuration = tempo.baseDuration || 4;
  const dotMultiplier = tempo.dotted ? 1.5 : 1.0;
  const effectiveQuarterBpm = Math.max(1, bpm * (4 / baseDuration) * dotMultiplier);
  return 60 / effectiveQuarterBpm;
}

function getElementMetricBeats(elem: MusicElement): number {
  if (elem.type === 'note' || elem.type === 'rest') {
    let beats = 4 / elem.duration;
    if (elem.dots === 1) beats *= 1.5;
    else if (elem.dots === 2) beats *= 1.75;
    if (elem.tuplet && elem.tuplet.actual > 0 && elem.tuplet.normal > 0) {
      beats *= elem.tuplet.normal / elem.tuplet.actual;
    }
    return beats;
  }
  return 0;
}

export function computeScoreMeasureSequence(score: Score): number[] {
  // 1. Group each staff's elements into measures delimited by 'bar'
  const staffMeasures = score.staves.map((staff) => {
    const measures: {
      elements: { element: MusicElement; elementIndex: number }[];
      isRepeatStart: boolean;
      nextIsRepeatStart: boolean;
      isRepeatEnd: boolean;
      voltaEndings?: number[];
      flowMarks: FlowMarkType[];
    }[] = [];

    let curElems: { element: MusicElement; elementIndex: number }[] = [];
    let isRepStart = false;
    let nextIsRepStart = false;
    let isRepEnd = false;
    let voltaEnd: number[] | undefined = undefined;
    let flowMarks: FlowMarkType[] = [];

    staff.elements.forEach((elem, elementIndex) => {
      curElems.push({ element: elem, elementIndex });

      if (elem.type === 'volta') {
        voltaEnd = elem.endings;
      } else if (elem.type === 'flow') {
        flowMarks.push(elem.mark);
      } else if (elem.type === 'bar') {
        const hasPrecedingNotes = curElems.some(
          (e) => e.element.type === 'note' || e.element.type === 'rest'
        );

        if (elem.barType === 'repeat-start') {
          if (hasPrecedingNotes) {
            nextIsRepStart = true;
          } else {
            isRepStart = true;
          }
        } else if (elem.barType === 'repeat-end') {
          isRepEnd = true;
        } else if (elem.barType === 'repeat-both') {
          isRepEnd = true;
          nextIsRepStart = true;
        }

        measures.push({
          elements: curElems,
          isRepeatStart: isRepStart,
          nextIsRepeatStart: nextIsRepStart,
          isRepeatEnd: isRepEnd,
          voltaEndings: voltaEnd,
          flowMarks,
        });

        curElems = [];
        isRepStart = false;
        nextIsRepStart = false;
        isRepEnd = false;
        voltaEnd = undefined;
        flowMarks = [];
      }
    });

    if (curElems.length > 0) {
      measures.push({
        elements: curElems,
        isRepeatStart: isRepStart,
        nextIsRepeatStart: nextIsRepStart,
        isRepeatEnd: isRepEnd,
        voltaEndings: voltaEnd,
        flowMarks,
      });
    }

    return measures;
  });

  const numMeasures = Math.max(0, ...staffMeasures.map((sm) => sm.length));
  if (numMeasures === 0) return [];

  // 2. Merge measure metadata across all staves
  const mergedMeasures: {
    isRepeatStart: boolean;
    isRepeatEnd: boolean;
    voltaEndings?: number[];
    flowMarks: FlowMarkType[];
  }[] = [];

  for (let m = 0; m < numMeasures; m++) {
    let isStart = false;
    let isEnd = false;
    let vEndings: number[] | undefined = undefined;
    const fMarks: FlowMarkType[] = [];

    if (m > 0) {
      for (const sm of staffMeasures) {
        if (sm[m - 1]?.nextIsRepeatStart) {
          isStart = true;
          break;
        }
      }
    }

    for (const sm of staffMeasures) {
      const mData = sm[m];
      if (mData) {
        if (mData.isRepeatStart) isStart = true;
        if (mData.isRepeatEnd) isEnd = true;
        if (mData.voltaEndings) vEndings = mData.voltaEndings;
        for (const fm of mData.flowMarks) {
          if (!fMarks.includes(fm)) {
            fMarks.push(fm);
          }
        }
      }
    }

    mergedMeasures.push({
      isRepeatStart: isStart,
      isRepeatEnd: isEnd,
      voltaEndings: vEndings,
      flowMarks: fMarks,
    });
  }

  // Find target anchor measures for Segno and Coda
  const segnoMeasure = mergedMeasures.findIndex((m) => m.flowMarks.includes('segno'));
  const codaMeasure = mergedMeasures.findIndex((m) => m.flowMarks.includes('coda'));

  // 3. Compute execution order sequence
  const sequence: number[] = [];
  let currentMeasure = 0;
  let repeatStartMeasure = 0;
  let repeatPass = 1;
  let activeVolta: number[] | null = null;
  let iterations = 0;
  const maxIterations = Math.max(100, numMeasures * 8);

  // Musical Flow Navigation state (D.S. / D.C. / Coda / Fine)
  let hasFlowJumped = false;
  let flowJumpActive = false;
  let flowTarget: 'coda' | 'fine' | null = null;

  while (currentMeasure < numMeasures && iterations < maxIterations) {
    iterations++;
    const mInfo = mergedMeasures[currentMeasure];

    if (mInfo.isRepeatStart && !flowJumpActive) {
      repeatStartMeasure = currentMeasure;
    }

    if (mInfo.voltaEndings) {
      activeVolta = mInfo.voltaEndings;
    }

    const shouldPlay = !activeVolta || activeVolta.includes(repeatPass);
    if (shouldPlay) {
      sequence.push(currentMeasure);
    }

    // Handle Jump Pass navigation rules
    if (flowJumpActive) {
      // 1. If target is 'fine' and this measure contains 'fine': stop playback!
      if (flowTarget === 'fine' && mInfo.flowMarks.includes('fine')) {
        break;
      }

      // 2. If target is 'coda' and this measure contains 'to-coda' or repeat trigger: leap to Coda!
      if (
        flowTarget === 'coda' &&
        (mInfo.flowMarks.includes('to-coda') ||
          mInfo.flowMarks.includes('ds-al-coda') ||
          mInfo.flowMarks.includes('dc-al-coda'))
      ) {
        flowJumpActive = false;
        flowTarget = null;
        activeVolta = null;
        currentMeasure = codaMeasure !== -1 ? codaMeasure : currentMeasure + 1;
        continue;
      }

      // 3. Senza repetizione: repeat barlines do NOT loop on jump pass
      if (mInfo.isRepeatEnd) {
        activeVolta = null;
        currentMeasure++;
        continue;
      }
    } else {
      // Normal pass: handle repeat barlines
      if (mInfo.isRepeatEnd) {
        if (repeatPass === 1) {
          repeatPass = 2;
          activeVolta = null;
          currentMeasure = repeatStartMeasure;
          continue;
        } else {
          const hasNextVolta = mergedMeasures
            .slice(currentMeasure + 1)
            .some((m) => m.voltaEndings && m.voltaEndings.includes(2));
          repeatPass = hasNextVolta ? 2 : 1;
          activeVolta = null;
          repeatStartMeasure = currentMeasure + 1;
        }
      }

      // Normal pass: check flow jump triggers (D.S. / D.C.) if not jumped yet
      if (!hasFlowJumped) {
        const hasDsCoda = mInfo.flowMarks.includes('ds-al-coda');
        const hasDsFine = mInfo.flowMarks.includes('ds-al-fine');
        const hasDcCoda = mInfo.flowMarks.includes('dc-al-coda');
        const hasDcFine = mInfo.flowMarks.includes('dc-al-fine');

        if (hasDsCoda || hasDsFine || hasDcCoda || hasDcFine) {
          hasFlowJumped = true;
          flowJumpActive = true;
          flowTarget = hasDsCoda || hasDcCoda ? 'coda' : 'fine';
          repeatPass = 2; // Senza repetizione: skip 1st endings
          activeVolta = null;

          if (hasDsCoda || hasDsFine) {
            currentMeasure = segnoMeasure !== -1 ? segnoMeasure : 0;
          } else {
            currentMeasure = 0;
          }
          continue;
        }
      }
    }

    if (activeVolta && !activeVolta.includes(1) && shouldPlay) {
      activeVolta = null;
      repeatPass = 1;
      repeatStartMeasure = currentMeasure + 1;
    }

    currentMeasure++;
  }

  return sequence;
}

export function generatePlaybackEvents(score: Score): PlaybackEvent[] {
  const events: PlaybackEvent[] = [];
  const defaultBpm = score.info && score.info.tempo > 0 ? score.info.tempo : 120;
  let initialQuarterDurationSec = 60 / defaultBpm;

  // Split each staff into measures
  const staffMeasures = score.staves.map((staff) => {
    const measures: {
      elements: { element: MusicElement; elementIndex: number }[];
    }[] = [];

    let curElems: { element: MusicElement; elementIndex: number }[] = [];
    staff.elements.forEach((elem, elementIndex) => {
      curElems.push({ element: elem, elementIndex });
      if (elem.type === 'bar') {
        measures.push({ elements: curElems });
        curElems = [];
      }
    });

    if (curElems.length > 0) {
      measures.push({ elements: curElems });
    }

    return measures;
  });

  const numMeasures = Math.max(0, ...staffMeasures.map((sm) => sm.length));
  if (numMeasures === 0) return [];

  // Build measure-scoped tempo changes across all staves
  interface MeasureTempoChange {
    beatOffset: number;
    quarterDurationSec: number;
  }

  const measureTempoChanges: MeasureTempoChange[][] = [];
  let runningQSec = initialQuarterDurationSec;
  for (let m = 0; m < numMeasures; m++) {
    const changes: MeasureTempoChange[] = [];
    for (const sm of staffMeasures) {
      const mData = sm[m];
      if (!mData) continue;
      let beatOffset = 0;
      for (const item of mData.elements) {
        if (item.element.type === 'tempo') {
          const qSec = computeQuarterDurationSec(item.element);
          runningQSec = qSec;
          const existing = changes.find((c) => Math.abs(c.beatOffset - beatOffset) < 0.001);
          if (!existing) {
            changes.push({ beatOffset, quarterDurationSec: qSec });
          } else {
            existing.quarterDurationSec = qSec;
          }
        } else if (item.element.type === 'text') {
          const textQSec = parseTempoChangeFromText(item.element.text, runningQSec, initialQuarterDurationSec);
          if (textQSec !== null) {
            runningQSec = textQSec;
            const existing = changes.find((c) => Math.abs(c.beatOffset - beatOffset) < 0.001);
            if (!existing) {
              changes.push({ beatOffset, quarterDurationSec: textQSec });
            } else {
              existing.quarterDurationSec = textQSec;
            }
          }
        } else {
          beatOffset += getElementMetricBeats(item.element);
        }
      }
    }
    changes.sort((a, b) => a.beatOffset - b.beatOffset);
    measureTempoChanges.push(changes);
  }

  if (
    measureTempoChanges[0] &&
    measureTempoChanges[0].length > 0 &&
    measureTempoChanges[0][0].beatOffset <= 0.001
  ) {
    initialQuarterDurationSec = measureTempoChanges[0][0].quarterDurationSec;
  }

  // Determine active time signature capacity across measures (default 4/4 = 4 quarter beats)
  let activeTimeCapacity = 4.0;
  for (const staff of score.staves) {
    const timeElem = staff.elements.find((el): el is TimeSignatureElement => el.type === 'time');
    if (timeElem) {
      activeTimeCapacity = (timeElem.numerator / timeElem.denominator) * 4;
      break;
    }
  }

  // Precompute metric duration in seconds for each measure index [0 ... numMeasures - 1]
  const measureDurationsSec: number[] = [];
  let prevailingQuarterSec = initialQuarterDurationSec;

  for (let m = 0; m < numMeasures; m++) {
    // Check if any staff defines a time signature in measure m
    for (const sm of staffMeasures) {
      const mData = sm[m];
      if (mData) {
        for (const item of mData.elements) {
          if (item.element.type === 'time') {
            activeTimeCapacity = (item.element.numerator / item.element.denominator) * 4;
          }
        }
      }
    }

    // Compute maximum note/rest beats and actual note duration in seconds across all staves in this measure
    let maxStaffBeats = 0;
    let maxStaffDurationSec = 0;

    for (const sm of staffMeasures) {
      const mData = sm[m];
      if (!mData) continue;
      let sBeats = 0;
      let sDurSec = 0;
      let sQSec = prevailingQuarterSec;
      const mChanges = measureTempoChanges[m] || [];

      for (const item of mData.elements) {
        const applicableChanges = mChanges.filter((c) => c.beatOffset <= sBeats + 0.001);
        if (applicableChanges.length > 0) {
          sQSec = applicableChanges[applicableChanges.length - 1].quarterDurationSec;
        }

        if (item.element.type === 'note' || item.element.type === 'rest') {
          const beats = getElementMetricBeats(item.element);
          sBeats += beats;
          let durSec = (4 / item.element.duration) * sQSec;
          if (item.element.dots === 1) durSec *= 1.5;
          else if (item.element.dots === 2) durSec *= 1.75;
          if (item.element.tuplet && item.element.tuplet.actual > 0 && item.element.tuplet.normal > 0) {
            durSec *= item.element.tuplet.normal / item.element.tuplet.actual;
          }
          if (item.element.fermata) {
            durSec *= 2.0;
          }
          sDurSec += durSec;
        }
      }

      if (sBeats > maxStaffBeats) maxStaffBeats = sBeats;
      if (sDurSec > maxStaffDurationSec) maxStaffDurationSec = sDurSec;
    }

    let finalMeasureDurationSec: number;
    if (maxStaffDurationSec > 0) {
      finalMeasureDurationSec = maxStaffDurationSec;
    } else {
      // Empty measure across all staves: duration is determined by activeTimeCapacity
      let nominalDurationSec = 0;
      let currentSegmentQSec = prevailingQuarterSec;
      const mChanges = measureTempoChanges[m] || [];
      const changeBreakpoints = [0, ...mChanges.map((c) => c.beatOffset).filter((b) => b > 0 && b < activeTimeCapacity), activeTimeCapacity];
      const uniqueBreakpoints = Array.from(new Set(changeBreakpoints)).sort((a, b) => a - b);

      for (let i = 0; i < uniqueBreakpoints.length - 1; i++) {
        const bStart = uniqueBreakpoints[i];
        const bEnd = uniqueBreakpoints[i + 1];
        const matchingChange = mChanges.filter((c) => c.beatOffset <= bStart + 0.001);
        if (matchingChange.length > 0) {
          currentSegmentQSec = matchingChange[matchingChange.length - 1].quarterDurationSec;
        }
        nominalDurationSec += (bEnd - bStart) * currentSegmentQSec;
      }
      finalMeasureDurationSec = nominalDurationSec;
    }
    measureDurationsSec.push(finalMeasureDurationSec);

    const mChanges = measureTempoChanges[m] || [];
    if (mChanges.length > 0) {
      prevailingQuarterSec = mChanges[mChanges.length - 1].quarterDurationSec;
    }
  }

  const sequence = computeScoreMeasureSequence(score);

  // Precompute timeline start seconds and initial quarter seconds for each step in sequence
  const sequenceStepMeasureStartSec: number[] = [];
  const sequenceStepInitialQuarterSec: number[] = [];
  let runningTimelineSec = 0;
  let runningStepQSec = initialQuarterDurationSec;

  sequence.forEach((measureIndex) => {
    sequenceStepMeasureStartSec.push(runningTimelineSec);

    const changes = measureTempoChanges[measureIndex] || [];
    const startChange = changes.find((c) => c.beatOffset <= 0.001);
    if (startChange) {
      runningStepQSec = startChange.quarterDurationSec;
    }
    sequenceStepInitialQuarterSec.push(runningStepQSec);

    for (const c of changes) {
      if (c.beatOffset > 0.001) {
        runningStepQSec = c.quarterDurationSec;
      }
    }

    const durSec = measureDurationsSec[measureIndex] ?? (4 * runningStepQSec);
    runningTimelineSec += durSec;
  });

  score.staves.forEach((staff, staffIndex) => {
    if (staff.muted) return;
    let currentClef = staff.initialClef;
    let currentKeyAccidentalsCount = 0;
    let activeSlurTargetId: string | null = null;
    let activeOttavaTargetId: string | null = null;
    let activeOttavaShift = 0;
    const hasDynamicsOrHairpin = staff.elements.some(
      (e) =>
        e.type === 'dynamic' ||
        (e.type === 'note' && (e as NoteElement).hairpin) ||
        (e.type === 'text' && parseDynamicGainFromText((e as TextElement).text) !== null)
    );
    let currentDynamicGain = hasDynamicsOrHairpin ? 0.72 : 1.0;
    let currentStaffInstrument: InstrumentType = staff.instrument || 'piano';
    const measures = staffMeasures[staffIndex] || [];

    interface StaffNoteItem {
      noteElem: NoteElement;
      elementIndex: number;
      midiPitches: number[];
      startTimeSec: number;
      durationSec: number;
      nominalDurationSec: number;
      isSlurred: boolean;
      isSlurContinuation: boolean;
      isTiedContinuation?: boolean;
      dynamicGain: number;
      measureIndex: number;
      prevMidiPitches?: number[];
      instrument: InstrumentType;
      isTenuto?: boolean;
      isMordent?: boolean;
      isTurn?: boolean;
    }
    const staffNotes: StaffNoteItem[] = [];
    let lastStaffNoteMidiPitches: number[] | null = null;

    sequence.forEach((measureIndex, seqIdx) => {
      const measureStartSec = sequenceStepMeasureStartSec[seqIdx];
      let currentTimeSec = measureStartSec;
      const measure = measures[measureIndex];
      if (!measure) return;

      let currentMeasureQuarterSec = sequenceStepInitialQuarterSec[seqIdx] ?? initialQuarterDurationSec;
      let measureBeatOffset = 0;
      const mChanges = measureTempoChanges[measureIndex] || [];

      interface StaffChordItem {
        elementIndex: number;
        chordElem: TextElement;
        startTimeSec: number;
        dynamicGain: number;
        measureIndex: number;
      }
      const measureChords: StaffChordItem[] = [];

      measure.elements.forEach(({ element, elementIndex }) => {
        const applicableChanges = mChanges.filter((c) => c.beatOffset <= measureBeatOffset + 0.001);
        if (applicableChanges.length > 0) {
          currentMeasureQuarterSec = applicableChanges[applicableChanges.length - 1].quarterDurationSec;
        }

        if (element.type === 'clef') {
          currentClef = element.clefType;
        } else if (element.type === 'key') {
          currentKeyAccidentalsCount = element.accidentalsCount;
        } else if (element.type === 'tempo') {
          currentMeasureQuarterSec = computeQuarterDurationSec(element);
        } else if (element.type === 'dynamic') {
          currentDynamicGain = DYNAMIC_GAINS[element.mark] ?? 0.72;
        } else if (element.type === 'text') {
          if (element.category === 'chord') {
            measureChords.push({
              elementIndex,
              chordElem: element,
              startTimeSec: currentTimeSec,
              dynamicGain: currentDynamicGain,
              measureIndex,
            });
          } else {
            const dynGain = parseDynamicGainFromText(element.text);
            if (dynGain !== null) {
              currentDynamicGain = dynGain;
            } else if (/\b(cresc\.?|crescendo)\b/i.test(element.text)) {
              currentDynamicGain = Math.min(1.0, currentDynamicGain + 0.20);
            } else if (/\b(dim\.?|diminuendo|decresc\.?|decrescendo)\b/i.test(element.text)) {
              currentDynamicGain = Math.max(0.20, currentDynamicGain - 0.20);
            }

            const tempoChange = parseTempoChangeFromText(element.text, currentMeasureQuarterSec, initialQuarterDurationSec);
            if (tempoChange !== null) {
              currentMeasureQuarterSec = tempoChange;
            }

            const technique = parseTechniqueFromText(element.text);
            if (technique === 'pizz') {
              if (isBowedStringInstrument(staff.instrument)) {
                currentStaffInstrument = 'harp';
              }
            } else if (technique === 'arco') {
              if (isBowedStringInstrument(staff.instrument)) {
                currentStaffInstrument = staff.instrument || 'violin';
              }
            }
          }
        } else if (element.type === 'note') {
          const beatFraction = 4 / element.duration;
          let durationSec = beatFraction * currentMeasureQuarterSec;
          if (element.dots === 1) durationSec *= 1.5;
          else if (element.dots === 2) durationSec *= 1.75;
          if (element.tuplet && element.tuplet.actual > 0 && element.tuplet.normal > 0) {
            durationSec *= element.tuplet.normal / element.tuplet.actual;
          }
          const nominalDurationSec = durationSec;

          if (element.staccatissimo) {
            durationSec *= 0.25;
          } else if (element.staccato) {
            durationSec *= 0.50;
          } else if (element.marcato) {
            durationSec *= 0.70;
          } else if (element.fermata) {
            durationSec *= 2.0;
          } else if (element.tenuto) {
            durationSec = nominalDurationSec;
          }

          let currentNoteOttavaShift = activeOttavaShift;
          if (element.ottava && element.ottava.targetNoteId) {
            const shift = getOttavaSemitoneShift(element.ottava.type);
            activeOttavaShift = shift;
            currentNoteOttavaShift = shift;
            activeOttavaTargetId = element.ottava.targetNoteId;
          }

          const midiPitches = element.pitches.map((p) =>
            diatonicOffsetToMidi(
              p.diatonicOffset,
              currentClef,
              p.accidental,
              currentKeyAccidentalsCount
            ) + currentNoteOttavaShift
          );

          if (activeOttavaTargetId && element.id === activeOttavaTargetId) {
            activeOttavaTargetId = null;
            activeOttavaShift = 0;
          }

          const isSlurContinuation = activeSlurTargetId !== null;
          const prevMidiPitches = isSlurContinuation && lastStaffNoteMidiPitches ? [...lastStaffNoteMidiPitches] : undefined;
          lastStaffNoteMidiPitches = midiPitches;

          if (activeSlurTargetId && element.id === activeSlurTargetId) {
            activeSlurTargetId = null;
          }

          let isSlurred = false;
          if (element.slur && element.slur.targetNoteId) {
            activeSlurTargetId = element.slur.targetNoteId;
            isSlurred = true;
          } else if (activeSlurTargetId !== null) {
            isSlurred = true;
          }

          staffNotes.push({
            noteElem: element,
            elementIndex,
            midiPitches,
            startTimeSec: currentTimeSec,
            durationSec,
            nominalDurationSec,
            isSlurred,
            isSlurContinuation,
            dynamicGain: currentDynamicGain,
            measureIndex,
            prevMidiPitches,
            instrument: currentStaffInstrument,
            isTenuto: element.tenuto,
            isMordent: element.ornament === 'mordent',
            isTurn: element.ornament === 'turn',
          });

          if (element.fermata) {
            currentTimeSec += nominalDurationSec * 2.0;
          } else {
            currentTimeSec += nominalDurationSec;
          }
          measureBeatOffset += getElementMetricBeats(element);
        } else if (element.type === 'rest') {
          const beatFraction = 4 / element.duration;
          let durationSec = beatFraction * currentMeasureQuarterSec;
          if (element.dots === 1) durationSec *= 1.5;
          else if (element.dots === 2) durationSec *= 1.75;
          if (element.tuplet && element.tuplet.actual > 0 && element.tuplet.normal > 0) {
            durationSec *= element.tuplet.normal / element.tuplet.actual;
          }
          if (element.fermata) {
            currentTimeSec += durationSec * 2.0;
          } else {
            currentTimeSec += durationSec;
          }
          measureBeatOffset += getElementMetricBeats(element);
          activeSlurTargetId = null;
        }
      });

      const measureEndTimeSec = Math.max(
        currentTimeSec,
        measureStartSec + (measureDurationsSec[measureIndex] ?? 0)
      );
      for (let cIdx = 0; cIdx < measureChords.length; cIdx++) {
        const chordItem = measureChords[cIdx];
        let chordDurationSec: number;
        if (cIdx + 1 < measureChords.length) {
          chordDurationSec = measureChords[cIdx + 1].startTimeSec - chordItem.startTimeSec;
        } else {
          chordDurationSec = measureEndTimeSec - chordItem.startTimeSec;
        }
        if (chordDurationSec <= 0) {
          chordDurationSec = Math.max(0.5, currentMeasureQuarterSec * 4);
        }

        const midiPitches = parseChordToMidi(chordItem.chordElem.text);
        if (midiPitches.length > 0) {
          events.push({
            staffIndex,
            elementIndex: chordItem.elementIndex,
            midiPitches,
            startTimeSec: chordItem.startTimeSec,
            durationSec: chordDurationSec,
            instrument: 'piano',
            volume: chordItem.dynamicGain * 0.65 * (staff.volume ?? 1.0),
            isChordSymbol: true,
            measureIndex: chordItem.measureIndex,
          });
        }
      }
    });

    // Resolve ties across staffNotes: accumulate duration into the head and mark continuation
    for (let i = 0; i < staffNotes.length; i++) {
      const head = staffNotes[i];
      if (head.isTiedContinuation || !head.noteElem.tieOut) continue;

      let lastInChain = head;

      for (let j = i + 1; j < staffNotes.length; j++) {
        const candidate = staffNotes[j];
        if (candidate.isTiedContinuation) continue;

        const expectedStart = lastInChain.startTimeSec + lastInChain.nominalDurationSec;
        if (Math.abs(candidate.startTimeSec - expectedStart) > 0.005) {
          // Gap or rest between notes terminates tie
          break;
        }

        const pitchesMatch =
          head.midiPitches.length > 0 &&
          head.midiPitches.length === candidate.midiPitches.length &&
          head.midiPitches.every((p, pIdx) => p === candidate.midiPitches[pIdx]);

        if (!pitchesMatch) {
          break;
        }

        head.durationSec += candidate.durationSec;
        candidate.isTiedContinuation = true;

        if (candidate.noteElem.tieOut) {
          lastInChain = candidate;
        } else {
          break;
        }
      }
    }

    // Interpolate dynamic gains for notes within hairpins
    const resolvedGains = staffNotes.map((n) => n.dynamicGain);
    for (let i = 0; i < staffNotes.length; i++) {
      const hp = staffNotes[i].noteElem.hairpin;
      if (hp) {
        const k = staffNotes.findIndex((n, idx) => idx >= i && n.noteElem.id === hp.targetNoteId);
        if (k >= i) {
          const dStart = resolvedGains[i];
          const isCresc = hp.type === 'crescendo' || hp.type === 'cresc';
          const dEnd = isCresc
            ? Math.min(1.0, dStart + 0.35)
            : Math.max(0.20, dStart - 0.35);

          const tStart = staffNotes[i].startTimeSec;
          const tEnd = staffNotes[k].startTimeSec;

          for (let j = i; j <= k; j++) {
            const alpha = tEnd > tStart ? (staffNotes[j].startTimeSec - tStart) / (tEnd - tStart) : 0;
            resolvedGains[j] = dStart + alpha * (dEnd - dStart);
          }
        }
      }
    }

    // Emit final playback events with resolved volumes
    staffNotes.forEach((sn, idx) => {
      let vol = resolvedGains[idx] * (staff.volume ?? 1.0);
      if (sn.noteElem.accent) {
        vol = Math.min(1.0, vol * 1.25);
      } else if (sn.noteElem.marcato) {
        vol = Math.min(1.0, vol * 1.30);
      } else if (sn.noteElem.tenuto) {
        vol = Math.min(1.10, vol * 1.08);
      }

      let glissandoTargetMidi: number | undefined;
      let glissandoStyle: GlissandoStyle | undefined;
      if (sn.noteElem.glissando && sn.noteElem.glissando.targetNoteId) {
        const targetNote = staffNotes.find((n) => n.noteElem.id === sn.noteElem.glissando!.targetNoteId);
        if (targetNote && targetNote.midiPitches.length > 0) {
          glissandoTargetMidi = targetNote.midiPitches[0];
        } else {
          const targetElem = staff.elements.find(
            (e) => e.type === 'note' && e.id === sn.noteElem.glissando!.targetNoteId
          ) as NoteElement | undefined;
          if (targetElem && targetElem.pitches.length > 0) {
            glissandoTargetMidi = diatonicOffsetToMidi(
              targetElem.pitches[0].diatonicOffset,
              currentClef,
              targetElem.pitches[0].accidental,
              currentKeyAccidentalsCount
            );
          }
        }
        glissandoStyle = sn.noteElem.glissando.style || 'wavy';
      }

      events.push({
        staffIndex,
        elementIndex: sn.elementIndex,
        midiPitches: sn.midiPitches,
        startTimeSec: sn.startTimeSec,
        durationSec: sn.durationSec,
        instrument: sn.instrument,
        volume: vol,
        isSlurred: sn.isSlurred,
        isSlurContinuation: sn.isSlurContinuation,
        isTiedContinuation: sn.isTiedContinuation,
        ...(sn.noteElem.ornament === 'trill' ? { isTrill: true } : {}),
        ...(sn.isMordent ? { isMordent: true } : {}),
        ...(sn.isTurn ? { isTurn: true } : {}),
        ...(sn.isTenuto ? { isTenuto: true } : {}),
        ...(glissandoTargetMidi !== undefined ? { glissandoTargetMidi, glissandoStyle } : {}),
        measureIndex: sn.measureIndex,
        prevMidiPitches: sn.prevMidiPitches,
      });
    });
  });

  return events.sort((a, b) => {
    if (Math.abs(a.startTimeSec - b.startTimeSec) > 0.0001) {
      return a.startTimeSec - b.startTimeSec;
    }
    // Chord events sort first so that melodic note ticks take visual precedence
    if (a.isChordSymbol && !b.isChordSymbol) return -1;
    if (!a.isChordSymbol && b.isChordSymbol) return 1;
    // Primary staves sort after substaves so primary staff tick runs last and takes cursor precedence
    const staffA = score.staves[a.staffIndex];
    const staffB = score.staves[b.staffIndex];
    if (staffA?.substaffOf && !staffB?.substaffOf) return -1;
    if (!staffA?.substaffOf && staffB?.substaffOf) return 1;
    return a.staffIndex - b.staffIndex;
  });
}

export interface PlaybackOptions {
  startMeasureIndex?: number;
  onTick?: (staffIndex: number, elementIndex: number) => void;
  onEnd?: () => void;
}

export class ScorePlaybackScheduler {
  private activeTimeouts: ReturnType<typeof setTimeout>[] = [];
  private isRunning: boolean = false;

  public isPlayingScore(): boolean {
    return this.isRunning;
  }

  public play(
    score: Score,
    optionsOrOnEnd?: (() => void) | PlaybackOptions
  ): void {
    this.stop();
    this.isRunning = true;

    let onEnd: (() => void) | undefined;
    let onTick: ((staffIndex: number, elementIndex: number) => void) | undefined;
    let startMeasureIndex = 0;

    if (typeof optionsOrOnEnd === 'function') {
      onEnd = optionsOrOnEnd;
    } else if (optionsOrOnEnd && typeof optionsOrOnEnd === 'object') {
      onEnd = optionsOrOnEnd.onEnd;
      onTick = optionsOrOnEnd.onTick;
      if (optionsOrOnEnd.startMeasureIndex !== undefined) {
        startMeasureIndex = Math.max(0, optionsOrOnEnd.startMeasureIndex);
      }
    }

    const events = generatePlaybackEvents(score);
    if (events.length === 0) {
      this.isRunning = false;
      this.activeTimeouts = [];
      onEnd?.();
      return;
    }

    // Determine timeline start timestamp for startMeasureIndex
    let startTimeOffsetSec = 0;
    if (startMeasureIndex > 0) {
      // Find the first event that occurs at or after measure start boundary
      // In generatePlaybackEvents, measures are sequenced. Locate the minimum startTimeSec for events at startMeasureIndex
      const targetEvents = events.filter(
        (evt) => evt.measureIndex !== undefined && evt.measureIndex >= startMeasureIndex
      );
      if (targetEvents.length === 0) {
        this.isRunning = false;
        this.activeTimeouts = [];
        onEnd?.();
        return;
      }
      startTimeOffsetSec = Math.min(...targetEvents.map((e) => e.startTimeSec));
    }

    // Filter events to only those starting at or after startTimeOffsetSec
    const runnableEvents = events.filter(evt => evt.startTimeSec >= startTimeOffsetSec - 0.001);

    let maxEndSec = 0;
    runnableEvents.forEach(evt => {
      const delayMs = Math.max(0, (evt.startTimeSec - startTimeOffsetSec) * 1000);
      const timeout = setTimeout(() => {
        if (!this.isRunning) return;
        if (!evt.isTiedContinuation) {
          evt.midiPitches.forEach(pitch => {
            if (
              evt.glissandoTargetMidi !== undefined ||
              evt.glissandoStyle !== undefined ||
              evt.isMordent !== undefined ||
              evt.isTurn !== undefined ||
              evt.isTenuto !== undefined
            ) {
              const prevMidi = evt.prevMidiPitches && evt.prevMidiPitches.length > 0 ? evt.prevMidiPitches[0] : undefined;
              playTone(
                pitch,
                evt.durationSec,
                evt.instrument,
                evt.volume,
                evt.isSlurred ?? false,
                evt.isSlurContinuation ?? false,
                Boolean(evt.isTrill),
                prevMidi,
                evt.glissandoTargetMidi,
                evt.glissandoStyle,
                evt.isMordent,
                evt.isTurn,
                evt.isTenuto
              );
            } else {
              playTone(
                pitch,
                evt.durationSec,
                evt.instrument,
                evt.volume,
                evt.isSlurred ?? false,
                evt.isSlurContinuation ?? false,
                Boolean(evt.isTrill)
              );
            }
          });
        }
        onTick?.(evt.staffIndex, evt.elementIndex);
      }, delayMs);
      this.activeTimeouts.push(timeout);

      const endSec = (evt.startTimeSec - startTimeOffsetSec) + evt.durationSec;
      if (endSec > maxEndSec) maxEndSec = endSec;
    });

    const finishTimeout = setTimeout(() => {
      this.isRunning = false;
      this.activeTimeouts = [];
      onEnd?.();
    }, maxEndSec * 1000 + 200);
    this.activeTimeouts.push(finishTimeout);
  }

  public stop(): void {
    this.isRunning = false;
    this.activeTimeouts.forEach(t => clearTimeout(t));
    this.activeTimeouts = [];
    stopAllGlissando();
  }
}
