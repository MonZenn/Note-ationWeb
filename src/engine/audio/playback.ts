import { Score, MusicElement, FlowMarkType, InstrumentType, DynamicMark, NoteElement, TempoElement } from '../../types/score';
import { diatonicOffsetToMidi } from '../../utils/pitchUtils';
import { playTone } from './synth';

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
  isTrill?: boolean;
  measureIndex?: number;
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
  for (let m = 0; m < numMeasures; m++) {
    const changes: MeasureTempoChange[] = [];
    for (const sm of staffMeasures) {
      const mData = sm[m];
      if (!mData) continue;
      let beatOffset = 0;
      for (const item of mData.elements) {
        if (item.element.type === 'tempo') {
          const qSec = computeQuarterDurationSec(item.element);
          const existing = changes.find((c) => Math.abs(c.beatOffset - beatOffset) < 0.001);
          if (!existing) {
            changes.push({ beatOffset, quarterDurationSec: qSec });
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

  const sequence = computeScoreMeasureSequence(score);

  // Precompute initial quarter duration for each step in sequence
  const sequenceStepInitialQuarterSec: number[] = [];
  let currentQSec = initialQuarterDurationSec;

  sequence.forEach((measureIndex) => {
    const changes = measureTempoChanges[measureIndex] || [];
    const startChange = changes.find((c) => c.beatOffset <= 0.001);
    if (startChange) {
      currentQSec = startChange.quarterDurationSec;
    }
    sequenceStepInitialQuarterSec.push(currentQSec);

    for (const c of changes) {
      if (c.beatOffset > 0.001) {
        currentQSec = c.quarterDurationSec;
      }
    }
  });

  score.staves.forEach((staff, staffIndex) => {
    if (staff.muted) return;
    let currentTimeSec = 0;
    let currentClef = staff.initialClef;
    let currentKeyAccidentalsCount = 0;
    let activeSlurTargetId: string | null = null;
    const hasDynamicsOrHairpin = staff.elements.some(
      (e) => e.type === 'dynamic' || (e.type === 'note' && (e as NoteElement).hairpin)
    );
    let currentDynamicGain = hasDynamicsOrHairpin ? 0.72 : 1.0;
    const measures = staffMeasures[staffIndex] || [];

    interface StaffNoteItem {
      noteElem: NoteElement;
      elementIndex: number;
      midiPitches: number[];
      startTimeSec: number;
      durationSec: number;
      isSlurred: boolean;
      isSlurContinuation: boolean;
      dynamicGain: number;
      measureIndex: number;
    }
    const staffNotes: StaffNoteItem[] = [];

    sequence.forEach((measureIndex, seqIdx) => {
      const measure = measures[measureIndex];
      if (!measure) return;

      let currentMeasureQuarterSec = sequenceStepInitialQuarterSec[seqIdx] ?? initialQuarterDurationSec;
      let measureBeatOffset = 0;
      const mChanges = measureTempoChanges[measureIndex] || [];

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
        } else if (element.type === 'note') {
          const beatFraction = 4 / element.duration;
          let durationSec = beatFraction * currentMeasureQuarterSec;
          if (element.dots === 1) durationSec *= 1.5;
          else if (element.dots === 2) durationSec *= 1.75;
          const nominalDurationSec = durationSec;

          if (element.staccatissimo) {
            durationSec *= 0.25;
          } else if (element.staccato) {
            durationSec *= 0.50;
          } else if (element.marcato) {
            durationSec *= 0.70;
          } else if (element.fermata) {
            durationSec *= 2.0;
          }

          const midiPitches = element.pitches.map((p) =>
            diatonicOffsetToMidi(
              p.diatonicOffset,
              currentClef,
              p.accidental,
              currentKeyAccidentalsCount
            )
          );

          const isSlurContinuation = activeSlurTargetId !== null;
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
            isSlurred,
            isSlurContinuation,
            dynamicGain: currentDynamicGain,
            measureIndex,
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
          if (element.fermata) {
            currentTimeSec += durationSec * 2.0;
          } else {
            currentTimeSec += durationSec;
          }
          measureBeatOffset += getElementMetricBeats(element);
          activeSlurTargetId = null;
        }
      });
    });

    // Interpolate dynamic gains for notes within hairpins
    const resolvedGains = staffNotes.map((n) => n.dynamicGain);
    for (let i = 0; i < staffNotes.length; i++) {
      const hp = staffNotes[i].noteElem.hairpin;
      if (hp) {
        const k = staffNotes.findIndex((n, idx) => idx >= i && n.noteElem.id === hp.targetNoteId);
        if (k >= i) {
          const dStart = resolvedGains[i];
          const dEnd =
            hp.type === 'crescendo'
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
      }
      events.push({
        staffIndex,
        elementIndex: sn.elementIndex,
        midiPitches: sn.midiPitches,
        startTimeSec: sn.startTimeSec,
        durationSec: sn.durationSec,
        instrument: staff.instrument || 'piano',
        volume: vol,
        isSlurred: sn.isSlurred,
        isSlurContinuation: sn.isSlurContinuation,
        ...(sn.noteElem.ornament === 'trill' ? { isTrill: true } : {}),
        measureIndex: sn.measureIndex,
      });
    });
  });

  return events.sort((a, b) => a.startTimeSec - b.startTimeSec);
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
        evt.midiPitches.forEach(pitch =>
          playTone(
            pitch,
            evt.durationSec,
            evt.instrument,
            evt.volume,
            evt.isSlurred ?? false,
            evt.isSlurContinuation ?? false,
            Boolean(evt.isTrill)
          )
        );
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
  }
}
