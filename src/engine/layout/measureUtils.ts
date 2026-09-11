import { Score, MusicElement, TimeSignatureElement } from '../../types/score';
import { computeElementBeatDuration } from './geometry';

export interface MeasureNumberInfo {
  measureIndex: number;
  measureNumber: number;
  isPickup: boolean;
}

interface RawMeasure {
  elements: MusicElement[];
  hasEndingBar: boolean;
}

/**
 * Computes dynamic measure numbers for a score, automatically detecting pickup
 * (anacrusis) measures and synchronizing measure counts across all staves.
 */
export function computeScoreMeasureNumbers(score: Score): MeasureNumberInfo[] {
  if (!score.staves || score.staves.length === 0) {
    return [];
  }

  // 1. Partition each staff's elements into measures (delimited by 'bar')
  // Strip leading header elements (clef, key, time before first note/rest/bar)
  const staffMeasures: RawMeasure[][] = score.staves.map((staff) => {
    let headerCount = 0;
    while (
      headerCount < staff.elements.length &&
      (staff.elements[headerCount].type === 'clef' ||
        staff.elements[headerCount].type === 'key' ||
        staff.elements[headerCount].type === 'time')
    ) {
      headerCount++;
    }
    const body = staff.elements.slice(headerCount);
    const measures: RawMeasure[] = [];
    let cur: MusicElement[] = [];
    for (let i = 0; i < body.length; i++) {
      const el = body[i];
      cur.push(el);
      if (el.type === 'bar') {
        measures.push({ elements: cur, hasEndingBar: true });
        cur = [];
      }
    }
    if (cur.length > 0) {
      measures.push({ elements: cur, hasEndingBar: false });
    }
    return measures;
  });

  const totalMeasures = Math.max(0, ...staffMeasures.map((m) => m.length));
  if (totalMeasures === 0) {
    return [];
  }

  // 2. Find prevailing initial time signature capacity (default 4/4 = 4 beats)
  let timeSigCapacity = 4;
  for (const staff of score.staves) {
    const timeElem = staff.elements.find((el): el is TimeSignatureElement => el.type === 'time');
    if (timeElem) {
      timeSigCapacity = (timeElem.numerator / timeElem.denominator) * 4;
      break;
    }
  }

  // 3. Inspect Measure 0 to detect pickup (anacrusis) measure:
  // If Measure 0 has notes/rests and its total beat duration is strictly less than
  // the time signature capacity, AND it is explicitly terminated by a barline or has subsequent measures.
  let measure0Duration = 0;
  let measure0HasEndingBar = false;

  for (const measures of staffMeasures) {
    const m0 = measures[0];
    if (m0) {
      const dur = m0.elements.reduce((sum, el) => sum + computeElementBeatDuration(el), 0);
      if (dur > measure0Duration) {
        measure0Duration = dur;
      }
      if (m0.hasEndingBar) {
        measure0HasEndingBar = true;
      }
    }
  }

  const isPickup =
    (measure0HasEndingBar || totalMeasures > 1) &&
    measure0Duration > 0 &&
    measure0Duration < timeSigCapacity - 0.001;

  const result: MeasureNumberInfo[] = [];
  let currentMeasureNumber = isPickup ? 0 : 1;

  for (let mIdx = 0; mIdx < totalMeasures; mIdx++) {
    const isThisPickup = mIdx === 0 && isPickup;
    result.push({
      measureIndex: mIdx,
      measureNumber: currentMeasureNumber,
      isPickup: isThisPickup,
    });
    currentMeasureNumber++;
  }

  return result;
}

/**
 * Resolves the 0-indexed measure index containing the cursor element position.
 * Measures are delimited by 'bar' elements.
 */
export function getMeasureIndexAtCursor(elements: MusicElement[], cursorIndex: number): number {
  if (!elements || elements.length === 0 || cursorIndex <= 0) {
    return 0;
  }
  const bound = Math.min(cursorIndex, elements.length);
  let measureIndex = 0;
  for (let i = 0; i < bound; i++) {
    if (elements[i].type === 'bar') {
      measureIndex++;
    }
  }
  return measureIndex;
}

