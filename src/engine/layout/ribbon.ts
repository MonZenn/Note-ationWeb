import { MusicElement, Score } from '../../types/score';
import { getElementWidth, STAFF_START_X, computeElementBeatDuration } from './geometry';

export interface PositionedElement {
  element: MusicElement;
  x: number;
  width: number;
}

export function computeStaffElementPositions(
  elements: MusicElement[],
  startX?: number,
  lyrics?: string[],
  verses?: string[][],
  scale: number = 1.0
): PositionedElement[] {
  const result: PositionedElement[] = [];
  const effectiveStartX = startX !== undefined ? startX : Math.round(STAFF_START_X * scale);
  let currentX = effectiveStartX;
  let rhythmIdx = 0;

  for (const element of elements) {
    let lyricToken: string | undefined;
    if (element.type === 'note' || element.type === 'rest') {
      if (verses && verses.length > 0) {
        let maxToken: string | undefined;
        for (const v of verses) {
          if (v && rhythmIdx < v.length) {
            const token = v[rhythmIdx];
            if (!maxToken || (token && token.length > maxToken.length)) {
              maxToken = token;
            }
          }
        }
        lyricToken = maxToken;
      } else if (lyrics && rhythmIdx < lyrics.length) {
        lyricToken = lyrics[rhythmIdx];
      }
      rhythmIdx++;
    }
    const width = getElementWidth(element, lyricToken, scale);
    result.push({ element, x: currentX, width });
    currentX += width;
  }

  return result;
}

export function computeJustifiedStaffElementPositions(
  elements: MusicElement[],
  targetWidth: number,
  isLastSystem: boolean = false,
  lyricsOrStartX?: string[] | number,
  verses?: string[][],
  scale: number = 1.0
): PositionedElement[] {
  if (elements.length === 0) return [];

  let startX: number;
  let lyrics: string[] | undefined;
  if (typeof lyricsOrStartX === 'number') {
    startX = lyricsOrStartX;
    lyrics = undefined;
  } else {
    startX = Math.round(STAFF_START_X * scale);
    lyrics = lyricsOrStartX;
  }

  // Identify leading header elements (clef, key, time before the first note/rest/bar)
  let headerCount = 0;
  while (
    headerCount < elements.length &&
    (elements[headerCount].type === 'clef' ||
      elements[headerCount].type === 'key' ||
      elements[headerCount].type === 'time')
  ) {
    headerCount++;
  }

  const headerElements = elements.slice(0, headerCount);
  const musicElements = elements.slice(headerCount);

  // Position leading header elements at fixed standard widths
  const result: PositionedElement[] = [];
  let currentX = startX;

  for (const elem of headerElements) {
    const width = getElementWidth(elem, undefined, scale);
    result.push({ element: elem, x: currentX, width });
    currentX += width;
  }

  if (musicElements.length === 0) {
    return result;
  }

  const startMusicX = currentX;

  const getMusicElemWidth = (elem: MusicElement, rIdx: number) => {
    let lyricToken: string | undefined;
    if (elem.type === 'note' || elem.type === 'rest') {
      if (verses && verses.length > 0) {
        let maxToken: string | undefined;
        for (const v of verses) {
          if (v && rIdx < v.length) {
            const token = v[rIdx];
            if (!maxToken || (token && token.length > maxToken.length)) {
              maxToken = token;
            }
          }
        }
        lyricToken = maxToken;
      } else if (lyrics && rIdx < lyrics.length) {
        lyricToken = lyrics[rIdx];
      }
    }
    return getElementWidth(elem, lyricToken, scale);
  };

  let rIdx = 0;
  const naturalWidths: number[] = [];
  for (const elem of musicElements) {
    naturalWidths.push(getMusicElemWidth(elem, rIdx));
    if (elem.type === 'note' || elem.type === 'rest') {
      rIdx++;
    }
  }

  const naturalMusicWidth = naturalWidths.reduce((sum, w) => sum + w, 0);
  const totalNaturalWidth = startMusicX + naturalMusicWidth;

  const lastMusicElem = musicElements[musicElements.length - 1];
  const hasEndingFinalBar =
    isLastSystem &&
    lastMusicElem?.type === 'bar' &&
    (lastMusicElem as import('../../types/score').BarLineElement).barType === 'final';

  // If this is the last system of the score and underfilled (< 70% of targetWidth),
  // retain standard natural spacing to avoid unnaturally stretching ending measures,
  // unless it concludes with a final barline (where all measures on that line extend proportionally).
  const isUnderfilled = isLastSystem && !hasEndingFinalBar && totalNaturalWidth < targetWidth * 0.7;

  if (isUnderfilled || naturalMusicWidth <= 0 || targetWidth <= startMusicX) {
    for (let i = 0; i < musicElements.length; i++) {
      const elem = musicElements[i];
      const width = naturalWidths[i];
      result.push({ element: elem, x: currentX, width });
      currentX += width;
    }
    return result;
  }

  // Scale music elements proportionally so the final element reaches targetWidth
  const availableWidth = targetWidth - startMusicX;
  const justificationScale = availableWidth / naturalMusicWidth;

  for (let i = 0; i < musicElements.length; i++) {
    const elem = musicElements[i];
    if (i === musicElements.length - 1) {
      // Last element: make sure its right edge lands exactly flush against targetWidth
      const width = targetWidth - currentX;
      result.push({ element: elem, x: currentX, width });
    } else {
      const width = naturalWidths[i] * justificationScale;
      result.push({ element: elem, x: currentX, width });
      currentX += width;
    }
  }

  return result;
}

const roundBeat = (beat: number): number => Math.round(beat * 10000) / 10000;

export function computeSynchronizedScoreLayout(
  score: Score,
  startX: number = STAFF_START_X
): PositionedElement[][] {
  if (!score.staves || score.staves.length === 0) {
    return [];
  }

  // 1. Separate leading header elements (clef, key, time before first note/rest/bar) for each staff
  const headerElements: MusicElement[][] = [];
  const bodyElements: MusicElement[][] = [];

  for (const staff of score.staves) {
    let headerCount = 0;
    while (
      headerCount < staff.elements.length &&
      (staff.elements[headerCount].type === 'clef' ||
        staff.elements[headerCount].type === 'key' ||
        staff.elements[headerCount].type === 'time')
    ) {
      headerCount++;
    }
    headerElements.push(staff.elements.slice(0, headerCount));
    bodyElements.push(staff.elements.slice(headerCount));
  }

  // Calculate max header width across staves to align music start
  const headerWidths = headerElements.map((elems) =>
    elems.reduce((sum, el) => sum + getElementWidth(el), 0)
  );
  const maxHeaderWidth = Math.max(0, ...headerWidths);
  const musicStartX = startX + maxHeaderWidth;

  const results: PositionedElement[][] = score.staves.map(() => []);

  // Position header elements for each staff starting at startX
  headerElements.forEach((elems, sIdx) => {
    let curX = startX;
    for (const elem of elems) {
      const w = getElementWidth(elem);
      results[sIdx].push({ element: elem, x: curX, width: w });
      curX += w;
    }
  });

  // 2. Partition bodyElements of each staff into measures (delimited by 'bar')
  interface StaffMeasure {
    elements: MusicElement[];
    hasEndingBar: boolean;
  }

  const staffMeasures: StaffMeasure[][] = bodyElements.map((body) => {
    const measures: StaffMeasure[] = [];
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

  const maxMeasures = Math.max(0, ...staffMeasures.map((m) => m.length));
  let currentMeasureStartX = musicStartX;

  // 3. Process each measure across all staves
  for (let mIdx = 0; mIdx < maxMeasures; mIdx++) {
    // Collect elements and their beat offsets for each staff in this measure
    interface ItemData {
      element: MusicElement;
      beat: number;
      naturalWidth: number;
    }

    const staffMeasureData: {
      items: ItemData[];
      hasEndingBar: boolean;
      barElement: MusicElement | null;
    }[] = [];

    const beatsSet = new Set<number>();

    for (let sIdx = 0; sIdx < score.staves.length; sIdx++) {
      const measure = staffMeasures[sIdx][mIdx];
      if (!measure) {
        staffMeasureData.push({ items: [], hasEndingBar: false, barElement: null });
        continue;
      }

      const hasBar = measure.hasEndingBar;
      const musicElems = hasBar ? measure.elements.slice(0, -1) : measure.elements;
      const barElem = hasBar ? measure.elements[measure.elements.length - 1] : null;

      let curBeat = 0;
      const items: ItemData[] = [];
      for (const el of musicElems) {
        const rBeat = roundBeat(curBeat);
        items.push({ element: el, beat: rBeat, naturalWidth: getElementWidth(el) });
        curBeat += computeElementBeatDuration(el);
      }
      for (const it of items) {
        beatsSet.add(it.beat);
      }

      staffMeasureData.push({ items, hasEndingBar: hasBar, barElement: barElem });
    }

    const sortedBeats = Array.from(beatsSet).sort((a, b) => a - b);

    if (sortedBeats.length > 0) {
      // Calculate column widths for each beat
      const colWidths: number[] = [];
      const colStartX: number[] = [];
      let runningColX = currentMeasureStartX;

      for (let bIdx = 0; bIdx < sortedBeats.length; bIdx++) {
        const beat = sortedBeats[bIdx];
        colStartX.push(runningColX);

        // Find max width needed by any staff at this beat
        let maxStaffColWidth = 0;
        for (let sIdx = 0; sIdx < score.staves.length; sIdx++) {
          const staffItems = staffMeasureData[sIdx].items.filter((it) => it.beat === beat);
          const staffWidth = staffItems.reduce((sum, it) => sum + it.naturalWidth, 0);
          if (staffWidth > maxStaffColWidth) {
            maxStaffColWidth = staffWidth;
          }
        }
        const colWidth = Math.max(36, maxStaffColWidth);
        colWidths.push(colWidth);
        runningColX += colWidth;
      }

      const barStartX = runningColX;

      // Position elements on each staff
      for (let sIdx = 0; sIdx < score.staves.length; sIdx++) {
        const sData = staffMeasureData[sIdx];
        const items = sData.items;

        for (let itIdx = 0; itIdx < items.length; itIdx++) {
          const it = items[itIdx];
          const bIdx = sortedBeats.indexOf(it.beat);
          const baseColX = colStartX[bIdx];

          // Account for multiple items at the same beat on this staff (e.g. dynamic followed by note)
          const sameBeatItems = items.filter((other) => other.beat === it.beat);
          const indexInSameBeat = sameBeatItems.indexOf(it);
          const offsetWithinCol = sameBeatItems
            .slice(0, indexInSameBeat)
            .reduce((sum, other) => sum + other.naturalWidth, 0);

          const elemX = baseColX + offsetWithinCol;

          let elemWidth: number;
          if (indexInSameBeat < sameBeatItems.length - 1) {
            // Not the last item in this beat column: use natural width
            elemWidth = it.naturalWidth;
          } else {
            // Last item in this beat column: span until next element on this staff or barline
            let nextX: number;
            if (itIdx + 1 < items.length) {
              const nextBeat = items[itIdx + 1].beat;
              const nextBIdx = sortedBeats.indexOf(nextBeat);
              nextX = colStartX[nextBIdx];
            } else {
              nextX = barStartX;
            }
            elemWidth = Math.max(it.naturalWidth, nextX - elemX);
          }

          results[sIdx].push({
            element: it.element,
            x: elemX,
            width: elemWidth,
          });
        }

        // Ending barline for this staff if present
        if (sData.barElement) {
          const barWidth = getElementWidth(sData.barElement);
          results[sIdx].push({
            element: sData.barElement,
            x: barStartX,
            width: barWidth,
          });
        }
      }

      const anyHasBar = staffMeasureData.some((d) => d.hasEndingBar);
      const barWidth = 24;
      currentMeasureStartX = barStartX + (anyHasBar ? barWidth : 0);
    } else {
      // Empty measure or bar-only measure
      const anyHasBar = staffMeasureData.some((d) => d.hasEndingBar);
      if (anyHasBar) {
        const barWidth = 24;
        for (let sIdx = 0; sIdx < score.staves.length; sIdx++) {
          const sData = staffMeasureData[sIdx];
          if (sData.barElement) {
            results[sIdx].push({
              element: sData.barElement,
              x: currentMeasureStartX,
              width: barWidth,
            });
          }
        }
        currentMeasureStartX += barWidth;
      }
    }
  }

  return results;
}



