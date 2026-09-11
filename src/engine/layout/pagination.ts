import { Score, MusicElement, KeySignatureElement } from '../../types/score';
import {
  getElementWidth,
  STAFF_START_X,
  STAFF_HEIGHT,
  MM_TO_PX,
  computeElementBeatDuration,
  computeScoreMeasureNumbers,
  getActiveKeyAndClefAtMeasure,
  resolvePageSetup,
  DEFAULT_PAGE_SETUP,
} from './geometry';
import { PositionedElement } from './ribbon';

export { computeJustifiedStaffElementPositions } from './ribbon';

export function computeEffectiveSystemWidth(
  pageWidthPx: number = 820,
  leftMm: number = 12,
  rightMm: number = 12
): number {
  const marginPx = (leftMm + rightMm) * MM_TO_PX;
  return Math.max(300, Math.round(pageWidthPx - marginPx));
}

export interface PaginationOptions {
  systemWidth?: number;
  scale?: number;
  systemSpacing?: number;
  staffSpacing?: number;
}

export interface MeasureGroup {
  elements: MusicElement[];
  width: number;
}

export interface MultiMeasureRest {
  count: number;
  startX: number;
  endX: number;
  hiddenElementIds: string[];
}

export interface SystemStaff {
  staffId: string;
  name: string;
  clef: 'treble' | 'bass' | 'alto' | 'tenor';
  elements: MusicElement[];
  positionedElements?: PositionedElement[];
  multiMeasureRests?: MultiMeasureRest[];
  staffIndex?: number;
  substaffElements?: MusicElement[];
  substaffPositionedElements?: PositionedElement[];
}

export interface PageSystem {
  systems: {
    isLastSystem: boolean;
    startMeasureNumber?: number;
    staves: SystemStaff[];
  }[];
}

export function isStaffSilentOnSystem(staffElements: MusicElement[]): boolean {
  return !staffElements.some((e) => e.type === 'note');
}

export function computeMultiMeasureRests(positionedElements: PositionedElement[]): MultiMeasureRest[] {
  if (!positionedElements || positionedElements.length === 0) return [];

  interface MeasureSpan {
    measureIndex: number;
    elements: PositionedElement[];
    barPosition: PositionedElement | null;
    barType: string | null;
    isResting: boolean;
    startX: number;
    endX: number;
  }

  const measures: MeasureSpan[] = [];
  let curElems: PositionedElement[] = [];
  let mIdx = 0;

  for (let i = 0; i < positionedElements.length; i++) {
    const p = positionedElements[i];
    if (p.element.type === 'bar') {
      const barEl = p.element as import('../../types/score').BarLineElement;
      const barType = barEl.barType || 'single';

      const isFirst = mIdx === 0;
      const nonBar = curElems;
      const hasRest = nonBar.some((e) => e.element.type === 'rest');
      const hasInvalidElem = nonBar.some((e) => {
        if (
          e.element.type === 'note' ||
          e.element.type === 'volta' ||
          e.element.type === 'tempo' ||
          e.element.type === 'flow' ||
          e.element.type === 'text'
        ) {
          return true;
        }
        if (
          !isFirst &&
          !(e.element as KeySignatureElement).isInherited &&
          (e.element.type === 'clef' || e.element.type === 'key' || e.element.type === 'time')
        ) {
          return true;
        }
        return false;
      });
      const isResting = !hasInvalidElem && (hasRest || nonBar.length === 0);

      const startX = nonBar.length > 0 ? nonBar[0].x : p.x;
      const endX = p.x;

      measures.push({
        measureIndex: mIdx++,
        elements: nonBar,
        barPosition: p,
        barType,
        isResting,
        startX,
        endX,
      });
      curElems = [];
    } else {
      curElems.push(p);
    }
  }

  if (curElems.length > 0) {
    const isFirst = mIdx === 0;
    const nonBar = curElems;
    const hasRest = nonBar.some((e) => e.element.type === 'rest');
    const hasInvalidElem = nonBar.some((e) => {
      if (
        e.element.type === 'note' ||
        e.element.type === 'volta' ||
        e.element.type === 'tempo' ||
        e.element.type === 'flow' ||
        e.element.type === 'text'
      ) {
        return true;
      }
      if (
        !isFirst &&
        !(e.element as KeySignatureElement).isInherited &&
        (e.element.type === 'clef' || e.element.type === 'key' || e.element.type === 'time')
      ) {
        return true;
      }
      return false;
    });
    const isResting = !hasInvalidElem && (hasRest || nonBar.length === 0);
    const startX = nonBar[0].x;
    const endX = nonBar[nonBar.length - 1].x + nonBar[nonBar.length - 1].width;

    measures.push({
      measureIndex: mIdx++,
      elements: nonBar,
      barPosition: null,
      barType: null,
      isResting,
      startX,
      endX,
    });
  }

  const results: MultiMeasureRest[] = [];
  let currentGroup: MeasureSpan[] = [];

  const flushGroup = () => {
    if (currentGroup.length >= 2) {
      const count = currentGroup.length;
      const firstM = currentGroup[0];
      const lastM = currentGroup[count - 1];

      const hiddenIds: string[] = [];

      for (let g = 0; g < count; g++) {
        const m = currentGroup[g];
        for (const el of m.elements) {
          if (el.element.type === 'rest') {
            hiddenIds.push(el.element.id);
          }
        }
        if (g < count - 1 && m.barPosition) {
          hiddenIds.push(m.barPosition.element.id);
        }
      }

      const firstRest = firstM.elements.find((el) => el.element.type === 'rest');
      const startX = firstRest ? firstRest.x : (firstM.elements.length > 0 ? firstM.elements[0].x : firstM.startX);
      const endX = lastM.barPosition ? lastM.barPosition.x : lastM.endX;

      results.push({
        count,
        startX,
        endX,
        hiddenElementIds: hiddenIds,
      });
    }
    currentGroup = [];
  };

  for (let m = 0; m < measures.length; m++) {
    const meas = measures[m];
    if (meas.isResting) {
      currentGroup.push(meas);
      if (meas.barType !== 'single') {
        flushGroup();
      }
    } else {
      flushGroup();
    }
  }
  flushGroup();

  return results;
}

const roundBeat = (beat: number): number => Math.round(beat * 10000) / 10000;

export function wrapScoreIntoPages(
  score: Score,
  systemWidthOrOptions?: number | PaginationOptions,
  maxSystemsPerPage?: number
): PageSystem[] {
  const pageSetup = resolvePageSetup(score.info?.pageSetup);
  let systemWidth: number;
  let rawScale: number;
  let systemSpacing: number;
  let staffSpacing: number;

  if (typeof systemWidthOrOptions === 'number') {
    systemWidth = systemWidthOrOptions;
    rawScale = score.info?.pageSetup?.staffScale ?? 1.0;
    systemSpacing = score.info?.pageSetup?.systemSpacing ?? DEFAULT_PAGE_SETUP.systemSpacing;
    staffSpacing = score.info?.pageSetup?.staffSpacing ?? DEFAULT_PAGE_SETUP.staffSpacing;
  } else if (systemWidthOrOptions && typeof systemWidthOrOptions === 'object') {
    rawScale = systemWidthOrOptions.scale ?? pageSetup.staffScale;
    systemWidth =
      systemWidthOrOptions.systemWidth ??
      computeEffectiveSystemWidth(820, pageSetup.margins.leftMm, pageSetup.margins.rightMm);
    systemSpacing = systemWidthOrOptions.systemSpacing ?? pageSetup.systemSpacing;
    staffSpacing = systemWidthOrOptions.staffSpacing ?? pageSetup.staffSpacing;
  } else {
    rawScale = pageSetup.staffScale;
    systemWidth = computeEffectiveSystemWidth(820, pageSetup.margins.leftMm, pageSetup.margins.rightMm);
    systemSpacing = pageSetup.systemSpacing;
    staffSpacing = pageSetup.staffSpacing;
  }

  const scale = Number.isFinite(rawScale) ? Math.max(0.25, Math.min(3.0, rawScale)) : 1.0;

  const effectiveStaffStartX = Math.round(STAFF_START_X * scale);

  if (!score.staves || score.staves.length === 0) {
    return [
      {
        systems: [
          {
            isLastSystem: true,
            staves: [],
          },
        ],
      },
    ];
  }

  const primaryStaves = score.staves.filter((s) => !s.substaffOf);
  const effectivePrimaryStaves = primaryStaves.length > 0 ? primaryStaves : score.staves;

  const allEmpty = score.staves.every((s) => s.elements.length === 0);
  if (allEmpty) {
    return [
      {
        systems: [
          {
            isLastSystem: true,
            staves: effectivePrimaryStaves.map((s) => {
              const sIdx = score.staves.findIndex((st) => st.id === s.id);
              const childSubstaff = score.staves.find((st) => st.substaffOf === s.id);
              return {
                staffId: s.id,
                name: s.name,
                clef: s.initialClef,
                elements: [],
                positionedElements: [],
                staffIndex: sIdx >= 0 ? sIdx : 0,
                substaffElements: childSubstaff ? [] : undefined,
                substaffPositionedElements: childSubstaff ? [] : undefined,
              };
            }),
          },
        ],
      },
    ];
  }

  // 1. Separate leading header elements (clef, key, time before the first note/rest/bar) for each staff
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

  const maxHeaderWidth = Math.max(
    0,
    ...headerElements.map((elems) => elems.reduce((sum, el) => sum + getElementWidth(el, undefined, scale), 0))
  );

  // 2. Partition each staff's body elements into measures (delimited by 'bar')
  interface RawMeasure {
    elements: MusicElement[];
    hasEndingBar: boolean;
  }

  const staffMeasures: RawMeasure[][] = bodyElements.map((body) => {
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

  // 3. For each measure, compute synchronized beat grid and column widths
  interface MeasureColumn {
    beat: number;
    width: number;
  }

  interface MeasureData {
    measureIndex: number;
    columns: MeasureColumn[];
    barWidth: number;
    naturalWidth: number;
    staves: {
      items: { element: MusicElement; beat: number; naturalWidth: number }[];
      barElement: MusicElement | null;
    }[];
  }

  const measuresData: MeasureData[] = [];

  for (let m = 0; m < totalMeasures; m++) {
    const beatsSet = new Set<number>();
    const staffData: MeasureData['staves'] = [];

    for (let sIdx = 0; sIdx < score.staves.length; sIdx++) {
      const measure = staffMeasures[sIdx][m];
      if (!measure) {
        staffData.push({ items: [], barElement: null });
        continue;
      }
      const hasBar = measure.hasEndingBar;
      const musicElems = hasBar ? measure.elements.slice(0, -1) : measure.elements;
      const barElem = hasBar ? measure.elements[measure.elements.length - 1] : null;

      let curBeat = 0;
      const items: { element: MusicElement; beat: number; naturalWidth: number }[] = [];
      for (const el of musicElems) {
        const rBeat = roundBeat(curBeat);
        items.push({ element: el, beat: rBeat, naturalWidth: getElementWidth(el, undefined, scale) });
        curBeat += computeElementBeatDuration(el);
      }
      for (const it of items) {
        beatsSet.add(it.beat);
      }
      staffData.push({ items, barElement: barElem });
    }

    const sortedBeats = Array.from(beatsSet).sort((a, b) => a - b);
    const columns: MeasureColumn[] = [];

    for (const b of sortedBeats) {
      let maxStaffWidth = 0;
      for (let sIdx = 0; sIdx < score.staves.length; sIdx++) {
        const staffItems = staffData[sIdx].items.filter((it) => it.beat === b);
        const staffWidth = staffItems.reduce((sum, it) => sum + it.naturalWidth, 0);
        if (staffWidth > maxStaffWidth) {
          maxStaffWidth = staffWidth;
        }
      }
      columns.push({ beat: b, width: Math.max(Math.round(36 * scale), maxStaffWidth) });
    }

    const hasAnyBar = staffData.some((d) => d.barElement !== null);
    const barWidth = hasAnyBar ? Math.round(24 * scale) : 0;
    const naturalWidth = columns.reduce((sum, c) => sum + c.width, 0) + barWidth;

    measuresData.push({
      measureIndex: m,
      columns,
      barWidth,
      naturalWidth,
      staves: staffData,
    });
  }

  const getScoreMaxInheritedKeyWidthAtMeasure = (
    measureIdx: number
  ): number => {
    let maxWidth = 0;
    for (let sIdx = 0; sIdx < score.staves.length; sIdx++) {
      const s = score.staves[sIdx];
      // If this staff starts with an explicit key change at this measure, prioritize the changed key
      const startsWithExplicitKey = staffMeasures[sIdx]?.[measureIdx]?.elements.find(
        (el) => el.type === 'key' || el.type === 'note' || el.type === 'rest'
      )?.type === 'key';

      if (startsWithExplicitKey) {
        continue;
      }

      const ctx = getActiveKeyAndClefAtMeasure(s.elements, s.initialClef, measureIdx);
      if (ctx.key.accidentalsCount !== 0) {
        const keyElem: KeySignatureElement = {
          id: 'measure-key-calc',
          type: 'key',
          key: ctx.key.key,
          accidentalsCount: ctx.key.accidentalsCount,
        };
        const w = getElementWidth(keyElem, undefined, scale);
        if (w > maxWidth) maxWidth = w;
      }
    }
    return maxWidth;
  };

  // 4. Break oversized / unmeasured measures into fit units
  interface SystemUnit {
    measureIndex: number;
    isPartial: boolean;
    columns: MeasureColumn[];
    barWidth: number;
    naturalWidth: number;
    staves: MeasureData['staves'];
  }

  const systemUnits: SystemUnit[] = [];

  for (let mIdx = 0; mIdx < measuresData.length; mIdx++) {
    const mData = measuresData[mIdx];
    const inheritedKeyWidth = mIdx === 0 ? 0 : getScoreMaxInheritedKeyWidthAtMeasure(mIdx);
    const unitStartMargin = mIdx === 0 ? effectiveStaffStartX + maxHeaderWidth : effectiveStaffStartX + inheritedKeyWidth;

    if (mData.naturalWidth + unitStartMargin <= systemWidth || mData.columns.length <= 1) {
      systemUnits.push({
        measureIndex: mIdx,
        isPartial: false,
        columns: mData.columns,
        barWidth: mData.barWidth,
        naturalWidth: mData.naturalWidth,
        staves: mData.staves,
      });
    } else {
      // Split columns of oversized measure
      let curCols: MeasureColumn[] = [];
      let curWidth = 0;

      for (let cIdx = 0; cIdx < mData.columns.length; cIdx++) {
        const col = mData.columns[cIdx];
        const isLastCol = cIdx === mData.columns.length - 1;
        const addedWidth = col.width + (isLastCol ? mData.barWidth : 0);

        if (curCols.length > 0 && curWidth + addedWidth + effectiveStaffStartX > systemWidth) {
          const colBeats = new Set(curCols.map((c) => c.beat));
          const splitStaves = mData.staves.map((s) => ({
            items: s.items.filter((it) => colBeats.has(it.beat)),
            barElement: null,
          }));
          systemUnits.push({
            measureIndex: mIdx,
            isPartial: true,
            columns: curCols,
            barWidth: 0,
            naturalWidth: curWidth,
            staves: splitStaves,
          });
          curCols = [col];
          curWidth = col.width;
        } else {
          curCols.push(col);
          curWidth += col.width;
        }
      }

      if (curCols.length > 0) {
        const colBeats = new Set(curCols.map((c) => c.beat));
        const splitStaves = mData.staves.map((s) => ({
          items: s.items.filter((it) => colBeats.has(it.beat)),
          barElement: s.barElement,
        }));
        systemUnits.push({
          measureIndex: mIdx,
          isPartial: true,
          columns: curCols,
          barWidth: mData.barWidth,
          naturalWidth: curWidth + mData.barWidth,
          staves: splitStaves,
        });
      }
    }
  }

  // 5. Greedily pack units onto systems
  interface BuiltSystem {
    units: SystemUnit[];
    isFirstSystem: boolean;
  }

  const rawSystems: BuiltSystem[] = [];
  let currentUnits: SystemUnit[] = [];
  let currentSysWidth = effectiveStaffStartX + maxHeaderWidth;

  for (let uIdx = 0; uIdx < systemUnits.length; uIdx++) {
    const unit = systemUnits[uIdx];
    const isFirst = rawSystems.length === 0;
    const startMeasureIdx = unit.measureIndex;
    const inheritedKeyWidth = isFirst ? 0 : getScoreMaxInheritedKeyWidthAtMeasure(startMeasureIdx);
    const startX = isFirst ? effectiveStaffStartX + maxHeaderWidth : effectiveStaffStartX + inheritedKeyWidth;

    if (currentUnits.length === 0) {
      currentUnits.push(unit);
      currentSysWidth = startX + unit.naturalWidth;
    } else {
      if (currentSysWidth + unit.naturalWidth <= systemWidth) {
        currentUnits.push(unit);
        currentSysWidth += unit.naturalWidth;
      } else {
        rawSystems.push({ units: currentUnits, isFirstSystem: isFirst });
        currentUnits = [unit];
        const nextInheritedKeyWidth = getScoreMaxInheritedKeyWidthAtMeasure(startMeasureIdx);
        currentSysWidth = effectiveStaffStartX + nextInheritedKeyWidth + unit.naturalWidth;
      }
    }
  }

  if (currentUnits.length > 0) {
    rawSystems.push({ units: currentUnits, isFirstSystem: rawSystems.length === 0 });
  }

  // 6. Justify systems and compute positionedElements for all staves
  const totalSystemsCount = rawSystems.length;
  const measureInfos = computeScoreMeasureNumbers(score);

  const allSystems: PageSystem['systems'] = rawSystems.map((rawSys, sysIdx) => {
    const isLastSystem = sysIdx === totalSystemsCount - 1;
    const isFirstSystem = rawSys.isFirstSystem;
    const firstUnit = rawSys.units[0];
    const startMeasureIndex = firstUnit ? firstUnit.measureIndex : 0;
    const startMeasureInfo = firstUnit ? measureInfos.find((m) => m.measureIndex === firstUnit.measureIndex) : undefined;
    const startMeasureNumber = startMeasureInfo ? startMeasureInfo.measureNumber : 1;

    const maxSysInheritedKeyWidth = !isFirstSystem
      ? getScoreMaxInheritedKeyWidthAtMeasure(startMeasureIndex)
      : 0;
    const startMusicX = isFirstSystem ? effectiveStaffStartX + maxHeaderWidth : effectiveStaffStartX + maxSysInheritedKeyWidth;

    const naturalMusicWidth = rawSys.units.reduce((sum, u) => sum + u.naturalWidth, 0);
    const totalNaturalWidth = startMusicX + naturalMusicWidth;

    const isUnderfilled = isLastSystem && totalNaturalWidth < systemWidth * 0.7;
    const shouldJustify = !isUnderfilled && naturalMusicWidth > 0 && systemWidth > startMusicX;

    const justifyRatio = shouldJustify ? (systemWidth - startMusicX) / naturalMusicWidth : 1.0;

    const systemStaves: SystemStaff[] = effectivePrimaryStaves.map((staff) => {
      const sIdx = score.staves.findIndex((s) => s.id === staff.id);
      const childSubstaff = score.staves.find((s) => s.substaffOf === staff.id);
      const subIdx = childSubstaff ? score.staves.findIndex((s) => s.id === childSubstaff.id) : -1;

      const posElements: PositionedElement[] = [];
      const staffElements: MusicElement[] = [];

      const childPosElements: PositionedElement[] = [];
      const childStaffElements: MusicElement[] = [];

      const staffCtx = getActiveKeyAndClefAtMeasure(
        score.staves[sIdx].elements,
        score.staves[sIdx].initialClef,
        startMeasureIndex
      );

      // If first system, add leading header elements
      if (isFirstSystem) {
        let curHeaderX = effectiveStaffStartX;
        for (const h of headerElements[sIdx]) {
          const w = getElementWidth(h, undefined, scale);
          posElements.push({ element: h, x: curHeaderX, width: w });
          staffElements.push(h);
          curHeaderX += w;
        }
        if (subIdx >= 0) {
          let curChildHeaderX = effectiveStaffStartX;
          for (const h of headerElements[subIdx]) {
            const w = getElementWidth(h, undefined, scale);
            childPosElements.push({ element: h, x: curChildHeaderX, width: w });
            childStaffElements.push(h);
            curChildHeaderX += w;
          }
        }
      } else {
        // Subsequent systems: inherit active key signature at system start UNLESS this staff starts with an explicit key change
        const startsWithExplicitKey = staffMeasures[sIdx]?.[startMeasureIndex]?.elements.find(
          (el) => el.type === 'key' || el.type === 'note' || el.type === 'rest'
        )?.type === 'key';

        if (!startsWithExplicitKey && staffCtx.key.accidentalsCount !== 0) {
          const inheritedKey: KeySignatureElement = {
            id: `sys-key-${staff.id}-${sysIdx}`,
            type: 'key',
            key: staffCtx.key.key,
            accidentalsCount: staffCtx.key.accidentalsCount,
            isInherited: true,
          };
          const keyW = getElementWidth(inheritedKey, undefined, scale);
          posElements.push({ element: inheritedKey, x: effectiveStaffStartX, width: keyW });
          staffElements.push(inheritedKey);
        }
        if (subIdx >= 0) {
          const childStartsWithExplicitKey = staffMeasures[subIdx]?.[startMeasureIndex]?.elements.find(
            (el) => el.type === 'key' || el.type === 'note' || el.type === 'rest'
          )?.type === 'key';

          const childCtx = getActiveKeyAndClefAtMeasure(
            score.staves[subIdx].elements,
            score.staves[subIdx].initialClef,
            startMeasureIndex
          );
          if (!childStartsWithExplicitKey && childCtx.key.accidentalsCount !== 0) {
            const childInheritedKey: KeySignatureElement = {
              id: `sys-key-${childSubstaff?.id ?? 'substaff'}-${sysIdx}`,
              type: 'key',
              key: childCtx.key.key,
              accidentalsCount: childCtx.key.accidentalsCount,
              isInherited: true,
            };
            const childKeyW = getElementWidth(childInheritedKey, undefined, scale);
            childPosElements.push({ element: childInheritedKey, x: effectiveStaffStartX, width: childKeyW });
            childStaffElements.push(childInheritedKey);
          }
        }
      }

      let runningUnitX = startMusicX;

      for (let uIdx = 0; uIdx < rawSys.units.length; uIdx++) {
        const unit = rawSys.units[uIdx];
        const isLastUnitInSystem = uIdx === rawSys.units.length - 1;
        const unitStaves = unit.staves[sIdx];
        const unitItems = unitStaves.items;

        const colStartX: number[] = [];
        let runningColX = runningUnitX;

        for (let cIdx = 0; cIdx < unit.columns.length; cIdx++) {
          colStartX.push(runningColX);
          const colW = unit.columns[cIdx].width * justifyRatio;
          runningColX += colW;
        }

        const barStartX = runningColX;
        const scaledBarWidth = unit.barWidth * justifyRatio;

        // Position items
        for (let itIdx = 0; itIdx < unitItems.length; itIdx++) {
          const it = unitItems[itIdx];
          const bIdx = unit.columns.findIndex((c) => c.beat === it.beat);
          const baseColX = bIdx >= 0 ? colStartX[bIdx] : runningUnitX;

          const sameBeatItems = unitItems.filter((other) => other.beat === it.beat);
          const idxInSame = sameBeatItems.indexOf(it);
          const offsetWithin = sameBeatItems
            .slice(0, idxInSame)
            .reduce((sum, o) => sum + o.naturalWidth, 0);

          const elemX = baseColX + offsetWithin;

          let elemWidth: number;
          if (idxInSame < sameBeatItems.length - 1) {
            elemWidth = it.naturalWidth;
          } else {
            let nextX: number;
            if (itIdx + 1 < unitItems.length) {
              const nextBeat = unitItems[itIdx + 1].beat;
              const nextBIdx = unit.columns.findIndex((c) => c.beat === nextBeat);
              nextX = nextBIdx >= 0 ? colStartX[nextBIdx] : barStartX;
            } else {
              nextX = barStartX;
            }
            elemWidth = Math.max(it.naturalWidth, nextX - elemX);
          }

          posElements.push({ element: it.element, x: elemX, width: elemWidth });
          staffElements.push(it.element);
        }

        // Position items for child substaff if present
        if (subIdx >= 0) {
          const childUnitStaves = unit.staves[subIdx];
          const childUnitItems = childUnitStaves.items;

          for (let itIdx = 0; itIdx < childUnitItems.length; itIdx++) {
            const it = childUnitItems[itIdx];
            const bIdx = unit.columns.findIndex((c) => c.beat === it.beat);
            const baseColX = bIdx >= 0 ? colStartX[bIdx] : runningUnitX;

            const sameBeatItems = childUnitItems.filter((other) => other.beat === it.beat);
            const idxInSame = sameBeatItems.indexOf(it);
            const offsetWithin = sameBeatItems
              .slice(0, idxInSame)
              .reduce((sum, o) => sum + o.naturalWidth, 0);

            const elemX = baseColX + offsetWithin;

            let elemWidth: number;
            if (idxInSame < sameBeatItems.length - 1) {
              elemWidth = it.naturalWidth;
            } else {
              let nextX: number;
              if (itIdx + 1 < childUnitItems.length) {
                const nextBeat = childUnitItems[itIdx + 1].beat;
                const nextBIdx = unit.columns.findIndex((c) => c.beat === nextBeat);
                nextX = nextBIdx >= 0 ? colStartX[nextBIdx] : barStartX;
              } else {
                nextX = barStartX;
              }
              elemWidth = Math.max(it.naturalWidth, nextX - elemX);
            }

            childPosElements.push({ element: it.element, x: elemX, width: elemWidth });
            childStaffElements.push(it.element);
          }

          if (childUnitStaves.barElement) {
            let barW = Math.max(Math.round(24 * scale), scaledBarWidth);
            if (shouldJustify && isLastUnitInSystem) {
              barW = systemWidth - barStartX;
            }
            childPosElements.push({
              element: childUnitStaves.barElement,
              x: barStartX,
              width: barW,
            });
            childStaffElements.push(childUnitStaves.barElement);
          }
        }

        // Position barline if present
        if (unitStaves.barElement) {
          let barW = Math.max(Math.round(24 * scale), scaledBarWidth);
          if (shouldJustify && isLastUnitInSystem) {
            barW = systemWidth - barStartX;
          }
          posElements.push({
            element: unitStaves.barElement,
            x: barStartX,
            width: barW,
          });
          staffElements.push(unitStaves.barElement);
        }

        runningUnitX = barStartX + scaledBarWidth;
      }

      const sysStaff: SystemStaff = {
        staffId: staff.id,
        name: staff.name,
        clef: isFirstSystem ? staff.initialClef : staffCtx.clef,
        elements: staffElements,
        positionedElements: posElements,
        staffIndex: sIdx,
        substaffElements: childSubstaff ? childStaffElements : undefined,
        substaffPositionedElements: childSubstaff ? childPosElements : undefined,
      };

      if (score.info?.multiMeasureRests) {
        sysStaff.multiMeasureRests = computeMultiMeasureRests(posElements);
      }

      return sysStaff;
    });

    let finalStaves = systemStaves;
    if (score.info?.hideEmptyStaves) {
      const activeStaves = systemStaves.filter(
        (s) => !isStaffSilentOnSystem(s.elements) || (s.substaffElements && !isStaffSilentOnSystem(s.substaffElements))
      );
      finalStaves = activeStaves.length > 0 ? activeStaves : [systemStaves[0]];
    }

    return {
      isLastSystem,
      startMeasureNumber,
      staves: finalStaves,
    };
  });

  // Determine system capacity per page dynamically
  const primaryStavesCount = Math.max(1, effectivePrimaryStaves.length);
  const staffSvgHeight = STAFF_HEIGHT * 2 * scale;
  const systemHeight = primaryStavesCount * staffSvgHeight + (primaryStavesCount - 1) * staffSpacing;

  const pageHeight = 1080;
  const marginVerticalPx = (pageSetup.margins.topMm + pageSetup.margins.bottomMm) * MM_TO_PX;
  const headerHeight = 160;
  const footerHeight = 85;
  const page1AvailHeight = pageHeight - marginVerticalPx - headerHeight - footerHeight;
  const otherPageAvailHeight = pageHeight - marginVerticalPx - footerHeight;

  const calcCapacity = (availHeight: number) => {
    if (systemHeight <= 0) return 1;
    const capacity = Math.floor((availHeight + systemSpacing) / (systemHeight + systemSpacing));
    return Math.max(1, capacity);
  };

  const page1Capacity = maxSystemsPerPage ?? calcCapacity(page1AvailHeight);
  const otherPageCapacity = maxSystemsPerPage ?? calcCapacity(otherPageAvailHeight);

  const pages: PageSystem[] = [];
  const remainingSystems = [...allSystems];

  const page1Systems = remainingSystems.splice(0, page1Capacity);
  pages.push({ systems: page1Systems });

  while (remainingSystems.length > 0) {
    const pageSystems = remainingSystems.splice(0, otherPageCapacity);
    pages.push({ systems: pageSystems });
  }

  return pages.length > 0 ? pages : [{ systems: allSystems }];
}

