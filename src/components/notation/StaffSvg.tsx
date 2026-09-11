import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Staff,
  NoteElement,
  MusicElement,
  TimeSignatureElement,
  KeySignatureElement,
  ClefElement,
  MeasureNumberingMode,
  TextElement,
  TempoElement,
  ScoreFontsConfig,
  ClefType,
  BarLineElement,
} from '../../types/score';
import {
  STAFF_LINE_SPACING,
  STAFF_START_X,
  computeSlurGeometry,
  computeStaffBeams,
  computeStaffLyricsLayout,
  calculatePitchY,
  MeasureNumberInfo,
} from '../../engine/layout/geometry';

import { computeStaffElementPositions, PositionedElement } from '../../engine/layout/ribbon';
import { MultiMeasureRest } from '../../engine/layout/pagination';
import { ElementSvg } from './ElementSvg';
import { CursorSvg } from './CursorSvg';
import { GhostNoteSvg } from './GhostNoteSvg';

interface Props {
  staff?: Staff;
  elements?: MusicElement[];
  substaffElements?: MusicElement[];
  substaffPositionedElements?: PositionedElement[];
  clef?: ClefType;
  isMergedSubstaff?: boolean;
  isActive?: boolean;
  centerY?: number;
  width?: number;
  cursorIndex?: number;
  pitchOffset?: number;
  onStaffClick?: (elementIndex: number, pitchOffset: number) => void;
  selectedRange?: { startIndex: number; endIndex: number } | null;
  onRangeSelect?: (range: { startIndex: number; endIndex: number } | null, anchorIndex?: number) => void;
  positionedElements?: PositionedElement[];
  measureNumbers?: MeasureNumberInfo[];
  measureNumberingMode?: MeasureNumberingMode;
  onTextClick?: (element: TextElement, index: number) => void;
  onTempoClick?: (element: TempoElement, index: number) => void;
  onKeyClick?: (element: KeySignatureElement, index: number) => void;
  onClefClick?: (element: ClefElement, index: number) => void;
  multiMeasureRests?: MultiMeasureRest[];
  fullStaffElements?: MusicElement[];
  scale?: number;
  fonts?: ScoreFontsConfig;
  autoBeaming?: boolean;
}

export const StaffSvg: React.FC<Props> = ({
  staff,
  elements,
  substaffElements,
  substaffPositionedElements,
  clef,
  isMergedSubstaff,
  isActive = false,
  centerY = 40,
  width = 800,
  cursorIndex = 0,
  pitchOffset = 0,
  onStaffClick = () => {},
  selectedRange,
  onRangeSelect,
  positionedElements: propPositionedElements,
  measureNumbers,
  measureNumberingMode,
  onTextClick,
  onTempoClick,
  onKeyClick,
  onClefClick,
  multiMeasureRests,
  fullStaffElements,
  scale = 1.0,
  fonts,
  autoBeaming = true,
}) => {
  const effectiveStaff: Staff = staff
    ? {
        ...staff,
        elements: elements || staff.elements,
        initialClef: clef || staff.initialClef,
      }
    : {
        id: 'staff-default',
        name: 'Staff',
        initialClef: clef || 'treble',
        muted: false,
        volume: 1.0,
        lyrics: [],
        elements: elements || [],
      };

  const lines = [-2, -1, 0, 1, 2]; // 5 staff lines
  const positionedElements =
    propPositionedElements ||
    computeStaffElementPositions(
      effectiveStaff.elements,
      Math.round(STAFF_START_X * scale),
      effectiveStaff.lyrics,
      effectiveStaff.verses,
      scale
    );

  const substaffPositioned =
    substaffPositionedElements ||
    (substaffElements
      ? computeStaffElementPositions(
          substaffElements,
          Math.round(STAFF_START_X * scale),
          undefined,
          undefined,
          scale
        )
      : []);

  const hasSubstaff = Boolean(substaffElements && substaffElements.length > 0) || Boolean(isMergedSubstaff);

  const svgRef = useRef<SVGSVGElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragStartIdx, setDragStartIdx] = useState<number | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const hasDraggedRef = useRef(false);

  const cursorX = cursorIndex === 0
    ? 75
    : (positionedElements[cursorIndex - 1]?.x || 75) + (positionedElements[cursorIndex - 1]?.width || 36);

  const getElementIndexAtX = useCallback((clickX: number) => {
    let targetIdx = 0;
    for (let i = 0; i < positionedElements.length; i++) {
      const elem = positionedElements[i];
      if (clickX >= elem.x + elem.width / 2) {
        targetIdx = i + 1;
      }
    }
    return targetIdx;
  }, [positionedElements]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetIdx = getElementIndexAtX(clickX);

    if (e.shiftKey) {
      if (targetIdx === cursorIndex) {
        onRangeSelect?.(null, cursorIndex);
      } else {
        const startIndex = Math.min(cursorIndex, targetIdx);
        const endIndex = Math.max(cursorIndex, targetIdx);
        onRangeSelect?.({ startIndex, endIndex }, cursorIndex);
      }
      return;
    }

    setIsMouseDown(true);
    setDragStartIdx(targetIdx);
    setHasDragged(false);
    hasDraggedRef.current = false;
  };

  useEffect(() => {
    if (!isMouseDown) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (dragStartIdx === null) return;
      let clickX = e.clientX;
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        clickX = e.clientX - rect.left;
      }
      const curIdx = getElementIndexAtX(clickX);

      if (curIdx !== dragStartIdx) {
        hasDraggedRef.current = true;
        setHasDragged(true);
        const startIndex = Math.min(dragStartIdx, curIdx);
        const endIndex = Math.max(dragStartIdx, curIdx);
        onRangeSelect?.({ startIndex, endIndex }, dragStartIdx);
      } else if (hasDraggedRef.current) {
        onRangeSelect?.(null, dragStartIdx);
      }
    };

    const handleWindowMouseUp = () => {
      setIsMouseDown(false);
      setDragStartIdx(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isMouseDown, dragStartIdx, getElementIndexAtX, onRangeSelect]);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (hasDragged || hasDraggedRef.current) {
      setHasDragged(false);
      hasDraggedRef.current = false;
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const targetIdx = getElementIndexAtX(clickX);

    if (e.shiftKey) {
      if (targetIdx === cursorIndex) {
        onRangeSelect?.(null, cursorIndex);
      } else {
        const startIndex = Math.min(cursorIndex, targetIdx);
        const endIndex = Math.max(cursorIndex, targetIdx);
        onRangeSelect?.({ startIndex, endIndex }, cursorIndex);
      }
      return;
    }

    // Calculate nearest diatonic offset
    const relativeY = centerY - clickY;
    const rawOffset = Math.round(relativeY / ((STAFF_LINE_SPACING * scale) / 2));
    onStaffClick(targetIdx, Math.max(-14, Math.min(14, rawOffset)));
  };

  let selectionBox: React.ReactNode = null;
  if (isActive && selectedRange && selectedRange.startIndex !== selectedRange.endIndex) {
    const sIdx = Math.min(selectedRange.startIndex, selectedRange.endIndex);
    const eIdx = Math.max(selectedRange.startIndex, selectedRange.endIndex);
    const startElem = positionedElements[sIdx];
    const endElem = positionedElements[eIdx - 1];

    const startX = startElem ? startElem.x : 75;
    const endX = endElem ? endElem.x + endElem.width : startX + 36;
    const boxX = Math.min(startX, endX) - 4;
    const boxWidth = Math.max(16, Math.abs(endX - startX) + 8);

    selectionBox = (
      <rect
        x={boxX}
        y={centerY - 35}
        width={boxWidth}
        height={70}
        rx={4}
        fill="rgba(59, 130, 246, 0.18)"
        stroke="#3b82f6"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        pointerEvents="none"
        data-testid="selection-box"
      />
    );
  }

  // Multi-Note Phrase Slurs
  const slurPaths: React.ReactNode[] = [];
  positionedElements.forEach(({ element }) => {
    if (element.type === 'note' && element.slur) {
      const targetNoteElem = positionedElements.find(
        (p) => p.element.id === element.slur?.targetNoteId && p.element.type === 'note'
      )?.element as NoteElement | undefined;

      if (targetNoteElem) {
        const slurGeom = computeSlurGeometry(
          element,
          targetNoteElem,
          positionedElements,
          centerY,
          scale,
          hasSubstaff ? 'voice-1' : undefined
        );
        if (slurGeom) {
          slurPaths.push(
            <path
              key={`slur-${element.id}-${element.slur.targetNoteId}`}
              d={slurGeom.path}
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.8"
              data-testid="multi-note-slur"
            />
          );
        }
      }
    }
  });

  // Hairpin Spanners (TASK-12)
  const hairpinPaths: React.ReactNode[] = [];
  positionedElements.forEach(({ element }) => {
    if (element.type === 'note' && element.hairpin) {
      const startPos = positionedElements.find((p) => p.element.id === element.id);
      const targetPos = positionedElements.find(
        (p) => p.element.id === element.hairpin?.targetNoteId && p.element.type === 'note'
      );

      if (startPos && targetPos) {
        const x1 = Math.min(startPos.x, targetPos.x) + 8;
        const x2 = Math.max(startPos.x + startPos.width, targetPos.x + targetPos.width) - 8;
        const yMid = centerY + 40;
        const spread = 6;
        const isCrescendo = element.hairpin.type === 'crescendo';

        const d = isCrescendo
          ? `M ${x2} ${yMid - spread} L ${x1} ${yMid} L ${x2} ${yMid + spread}`
          : `M ${x1} ${yMid - spread} L ${x2} ${yMid} L ${x1} ${yMid + spread}`;

        hairpinPaths.push(
          <path
            key={`hairpin-${element.id}-${element.hairpin.targetNoteId}`}
            d={d}
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.5"
            data-testid="hairpin-spanner"
            data-hairpin-type={element.hairpin.type}
          />
        );
      }
    }
  });

  // Substaff Multi-Note Phrase Slurs & Hairpins (Voice 2)
  const substaffSlurPaths: React.ReactNode[] = [];
  const substaffHairpinPaths: React.ReactNode[] = [];
  if (substaffElements && substaffPositioned.length > 0) {
    substaffPositioned.forEach(({ element }) => {
      if (element.type === 'note' && element.slur) {
        const targetNoteElem = substaffPositioned.find(
          (p) => p.element.id === element.slur?.targetNoteId && p.element.type === 'note'
        )?.element as NoteElement | undefined;

        if (targetNoteElem) {
          const slurGeom = computeSlurGeometry(
            element,
            targetNoteElem,
            substaffPositioned,
            centerY,
            scale,
            'voice-2'
          );
          if (slurGeom) {
            substaffSlurPaths.push(
              <path
                key={`sub-slur-${element.id}-${element.slur.targetNoteId}`}
                d={slurGeom.path}
                fill="none"
                stroke="#0f172a"
                strokeWidth="1.8"
                data-testid="multi-note-slur"
              />
            );
          }
        }
      }

      if (element.type === 'note' && element.hairpin) {
        const startPos = substaffPositioned.find((p) => p.element.id === element.id);
        const targetPos = substaffPositioned.find(
          (p) => p.element.id === element.hairpin?.targetNoteId && p.element.type === 'note'
        );

        if (startPos && targetPos) {
          const x1 = Math.min(startPos.x, targetPos.x) + 8;
          const x2 = Math.max(startPos.x + startPos.width, targetPos.x + targetPos.width) - 8;
          const yMid = centerY + 40;
          const spread = 6;
          const isCrescendo = element.hairpin.type === 'crescendo';

          const d = isCrescendo
            ? `M ${x2} ${yMid - spread} L ${x1} ${yMid} L ${x2} ${yMid + spread}`
            : `M ${x1} ${yMid - spread} L ${x2} ${yMid} L ${x1} ${yMid + spread}`;

          substaffHairpinPaths.push(
            <path
              key={`sub-hairpin-${element.id}-${element.hairpin.targetNoteId}`}
              d={d}
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.5"
              data-testid="hairpin-spanner"
              data-hairpin-type={element.hairpin.type}
            />
          );
        }
      }
    });
  }

  // Metric Note Beams
  const activeTimeSig = effectiveStaff.elements.find((e): e is TimeSignatureElement => e.type === 'time');
  const beamedGroups = computeStaffBeams(
    positionedElements,
    centerY,
    activeTimeSig,
    scale,
    hasSubstaff ? 'voice-1' : undefined,
    autoBeaming
  );
  const beamedNoteMap = new Map<string, { stemDirection: 'up' | 'down'; stemTipY: number }>();
  for (const bg of beamedGroups) {
    for (const item of bg.notes) {
      beamedNoteMap.set(item.note.id, {
        stemDirection: bg.stemDirection,
        stemTipY: item.stemTipY,
      });
    }
  }

  const shiftedSubstaffPositioned = substaffPositioned.map(({ element, x, width }) => {
    let shift = 0;
    if (element.type === 'note') {
      const v2Offsets = element.pitches.map((p) => p.diatonicOffset);
      const coincidingV1 = positionedElements.find(
        (p) =>
          p.element.type === 'note' &&
          Math.abs(p.x - x) < 14 * scale &&
          (p.element as NoteElement).pitches.some((p1) =>
            v2Offsets.some((p2) => Math.abs(p1.diatonicOffset - p2) <= 1)
          )
      );
      if (coincidingV1) {
        shift = 9 * scale;
      }
    }
    return { element, x: x + shift, width };
  });

  const subBeamedGroups = shiftedSubstaffPositioned.length > 0
    ? computeStaffBeams(shiftedSubstaffPositioned, centerY, activeTimeSig, scale, 'voice-2', autoBeaming)
    : [];
  const subBeamedNoteMap = new Map<string, { stemDirection: 'up' | 'down'; stemTipY: number }>();
  for (const bg of subBeamedGroups) {
    for (const item of bg.notes) {
      subBeamedNoteMap.set(item.note.id, {
        stemDirection: bg.stemDirection,
        stemTipY: item.stemTipY,
      });
    }
  }

  const hiddenIdsSet = new Set(multiMeasureRests?.flatMap((mm) => mm.hiddenElementIds) || []);

  // Measure numbers above barlines (if enabled)
  const barlineMeasureNodes: React.ReactNode[] = [];
  if (measureNumbers && measureNumbers.length > 0 && measureNumberingMode !== 'none') {
    let barCount = 0;
    for (let i = 0; i < positionedElements.length; i++) {
      const { element, x } = positionedElements[i];
      if (element.type === 'bar' && !hiddenIdsSet.has(element.id)) {
        const nextMeasureIndex = barCount + 1;
        barCount++;
        const info = measureNumbers.find((m) => m.measureIndex === nextMeasureIndex);
        if (info) {
          if (measureNumberingMode === 'interval-5' && info.measureNumber % 5 !== 0) {
            continue;
          }

          let measureY = centerY - 26;

          // Collision clearance: voltas or tempo markings nearby
          const hasVoltaOrTempoNearby = positionedElements.some(
            (p) =>
              (p.element.type === 'volta' || p.element.type === 'tempo') &&
              Math.abs(p.x - x) < 60
          );
          if (hasVoltaOrTempoNearby) {
            measureY = Math.min(measureY, centerY - 38);
          }

          // Collision clearance: high ledger lines / notes nearby
          for (let j = Math.max(0, i - 3); j <= Math.min(positionedElements.length - 1, i + 3); j++) {
            const nearbyEl = positionedElements[j].element;
            if (nearbyEl.type === 'note' && nearbyEl.pitches) {
              for (const p of nearbyEl.pitches) {
                if (p.diatonicOffset >= 6) {
                  const noteY = calculatePitchY(centerY, p.diatonicOffset);
                  measureY = Math.min(measureY, noteY - 12);
                }
              }
            }
          }

          const barX = x + 10;
          barlineMeasureNodes.push(
            <text
              key={`bar-meas-${element.id}-${info.measureNumber}`}
              data-testid="barline-measure-number"
              x={barX}
              y={measureY}
              textAnchor="middle"
              className="text-[10px] font-mono font-medium fill-slate-400 select-none"
            >
              {info.measureNumber}
            </text>
          );
        }
      }
    }
  }

  // Staff Lyrics Layout (TASK-18)
  const lyricsLayout = computeStaffLyricsLayout(
    effectiveStaff.elements,
    effectiveStaff.lyrics,
    positionedElements,
    centerY,
    effectiveStaff.verses,
    fullStaffElements,
    scale
  );

  // Calculate staff line ending width.
  // When a staff ends with a final barline and we are not actively placing elements after it,
  // terminate the 5 staff lines cleanly at the outer boundary of the final barline.
  let staffLineWidth = width;
  if (positionedElements && positionedElements.length > 0) {
    const lastElem = positionedElements[positionedElements.length - 1];
    if (lastElem.element.type === 'bar' && (lastElem.element as BarLineElement).barType === 'final') {
      const finalBarEnd = Math.round(lastElem.x + 15 * scale);
      staffLineWidth = isActive && cursorIndex >= positionedElements.length ? Math.max(finalBarEnd, width) : finalBarEnd;
    }
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={centerY * 2}
      className={`block cursor-crosshair overflow-visible ${isActive ? 'bg-blue-50/40 border-l-4 border-blue-600' : 'bg-white'}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* Staff Lines */}
      {lines.map((l) => (
        <line
          key={l}
          x1={0}
          y1={centerY + l * (STAFF_LINE_SPACING * scale)}
          x2={staffLineWidth}
          y2={centerY + l * (STAFF_LINE_SPACING * scale)}
          stroke="#64748b"
          strokeWidth="1.2"
        />
      ))}

      {/* Initial Clef Label */}
      <text
        x={12}
        y={effectiveStaff.initialClef === 'treble' ? centerY + 18 * scale : effectiveStaff.initialClef === 'bass' ? centerY + 7 * scale : centerY + 6 * scale}
        fontSize={scale === 1 ? (effectiveStaff.initialClef === 'treble' ? '54' : '42') : `${(effectiveStaff.initialClef === 'treble' ? 54 : 42) * scale}px`}
        fontWeight="bold"
        fill="#334155"
        data-testid="initial-clef"
      >
        {effectiveStaff.initialClef === 'treble' ? '𝄞' : effectiveStaff.initialClef === 'bass' ? '𝄢' : '𝄡'}
      </text>

      {/* Render Musical Elements (Voice 1 / Primary) */}
      {positionedElements.map(({ element, x }, idx) => {
        if (hiddenIdsSet.has(element.id)) {
          return null;
        }

        let elemWidth: number | undefined;
        if (element.type === 'volta') {
          for (let j = idx + 1; j < positionedElements.length; j++) {
            const nextElem = positionedElements[j];
            if (nextElem.element.type === 'bar' || nextElem.element.type === 'volta') {
              elemWidth = (nextElem.x + (nextElem.element.type === 'bar' ? nextElem.width : 0)) - x;
              break;
            }
          }
          if (elemWidth === undefined) {
            elemWidth = Math.max(60, width - x - 20);
          }
        }

        const beamInfo = element.type === 'note' ? beamedNoteMap.get(element.id) : undefined;

        const isText = element.type === 'text';
        const isTempo = element.type === 'tempo';
        const isKey = element.type === 'key';
        const isClef = element.type === 'clef';
        const isClickable =
          (isText && Boolean(onTextClick)) ||
          (isTempo && Boolean(onTempoClick)) ||
          (isKey && Boolean(onKeyClick)) ||
          (isClef && Boolean(onClefClick));

        const testId = isText
          ? 'text-element-wrapper'
          : isTempo
          ? 'tempo-element-wrapper'
          : isKey
          ? 'key-element-wrapper'
          : isClef
          ? 'clef-element-wrapper'
          : undefined;

        return (
          <g
            key={element.id}
            data-testid={testId}
            onMouseDown={
              isClickable
                ? (e) => {
                    e.stopPropagation();
                  }
                : undefined
            }
            onClick={
              isClickable
                ? (e) => {
                    e.stopPropagation();
                    if (isText && onTextClick) onTextClick(element as TextElement, idx);
                    if (isTempo && onTempoClick) onTempoClick(element as TempoElement, idx);
                    if (isKey && onKeyClick) onKeyClick(element as KeySignatureElement, idx);
                    if (isClef && onClefClick) onClefClick(element as ClefElement, idx);
                  }
                : undefined
            }
            className={isClickable ? 'cursor-pointer' : undefined}
          >
            <ElementSvg
              element={element}
              x={x}
              centerY={centerY}
              clef={effectiveStaff.initialClef}
              width={elemWidth}
              scale={scale}
              fonts={fonts}
              beamInfo={
                beamInfo
                  ? {
                      isBeamed: true,
                      stemDirection: beamInfo.stemDirection,
                      stemTipY: beamInfo.stemTipY,
                    }
                  : undefined
              }
              voice={hasSubstaff ? 'voice-1' : undefined}
            />
          </g>
        );
      })}

      {/* Render Substaff Elements (Voice 2) */}
      {substaffElements && (
        <g data-testid="substaff-elements">
          {substaffPositioned.map(({ element, x }, idx) => {
            if (hiddenIdsSet.has(element.id)) {
              return null;
            }

            if (element.type === 'bar' || element.type === 'clef' || element.type === 'key' || element.type === 'time') {
              return null;
            }

            let elemWidth: number | undefined;
            if (element.type === 'volta') {
              for (let j = idx + 1; j < substaffPositioned.length; j++) {
                const nextElem = substaffPositioned[j];
                if (nextElem.element.type === 'bar' || nextElem.element.type === 'volta') {
                  elemWidth = (nextElem.x + (nextElem.element.type === 'bar' ? nextElem.width : 0)) - x;
                  break;
                }
              }
              if (elemWidth === undefined) {
                elemWidth = Math.max(60, width - x - 20);
              }
            }

            const beamInfo = element.type === 'note' ? subBeamedNoteMap.get(element.id) : undefined;

            // Check coincidence with Voice 1 noteheads
            let noteheadShift = 0;
            if (element.type === 'note') {
              const v2Offsets = element.pitches.map((p) => p.diatonicOffset);
              const coincidingV1 = positionedElements.find(
                (p) =>
                  p.element.type === 'note' &&
                  Math.abs(p.x - x) < 14 * scale &&
                  (p.element as NoteElement).pitches.some((p1) =>
                    v2Offsets.some((p2) => Math.abs(p1.diatonicOffset - p2) <= 1)
                  )
              );
              if (coincidingV1) {
                noteheadShift = 9 * scale;
              }
            }

            return (
              <g key={`sub-${element.id}`}>
                <ElementSvg
                  element={element}
                  x={x}
                  centerY={centerY}
                  clef={effectiveStaff.initialClef}
                  width={elemWidth}
                  scale={scale}
                  fonts={fonts}
                  beamInfo={
                    beamInfo
                      ? {
                          isBeamed: true,
                          stemDirection: beamInfo.stemDirection,
                          stemTipY: beamInfo.stemTipY,
                        }
                      : undefined
                  }
                  voice="voice-2"
                  noteheadShift={noteheadShift}
                />
              </g>
            );
          })}
        </g>
      )}

      {/* Multi-Measure Rests */}
      {multiMeasureRests &&
        multiMeasureRests.map((mm, mmIdx) => {
          const availWidth = Math.max(0, mm.endX - mm.startX);
          const midX = (mm.startX + mm.endX) / 2;
          const hBarWidth = Math.min(availWidth - 20, Math.max(36, availWidth * 0.6));
          const barStartX = midX - hBarWidth / 2;
          const barEndX = midX + hBarWidth / 2;

          return (
            <g
              key={`mm-rest-${mmIdx}-${mm.startX}`}
              data-testid="multi-measure-rest"
              data-count={mm.count}
            >
              {/* Horizontal thick H-bar line */}
              <line
                x1={barStartX}
                y1={centerY}
                x2={barEndX}
                y2={centerY}
                stroke="#0f172a"
                strokeWidth="6"
                strokeLinecap="square"
              />
              {/* Left vertical serif bookend */}
              <line
                x1={barStartX}
                y1={centerY - 10 * scale}
                x2={barStartX}
                y2={centerY + 10 * scale}
                stroke="#0f172a"
                strokeWidth={2.5 * scale}
              />
              {/* Right vertical serif bookend */}
              <line
                x1={barEndX}
                y1={centerY - 10 * scale}
                x2={barEndX}
                y2={centerY + 10 * scale}
                stroke="#0f172a"
                strokeWidth={2.5 * scale}
              />
              {/* Measure count text centered above H-bar */}
              <text
                x={midX}
                y={centerY - 14}
                textAnchor="middle"
                className="font-serif font-bold text-base fill-slate-900 select-none"
              >
                {mm.count}
              </text>
            </g>
          );
        })}

      {/* Metric Beams */}
      {beamedGroups.map((bg, gIdx) => (
        <g key={`beam-group-${gIdx}`} data-testid="beam-group">
          {bg.polygons.map((p, pIdx) => (
            <polygon
              key={`beam-polygon-${gIdx}-${pIdx}`}
              points={p.points}
              fill="#0f172a"
              data-testid="beam-polygon"
            />
          ))}
        </g>
      ))}

      {/* Metric Beams for Substaff */}
      {subBeamedGroups.map((bg, gIdx) => (
        <g key={`sub-beam-group-${gIdx}`} data-testid="beam-group">
          {bg.polygons.map((p, pIdx) => (
            <polygon
              key={`sub-beam-polygon-${gIdx}-${pIdx}`}
              points={p.points}
              fill="#0f172a"
              data-testid="beam-polygon"
            />
          ))}
        </g>
      ))}

      {/* Multi-Note Phrase Slurs */}
      {slurPaths}
      {substaffSlurPaths}

      {/* Hairpin Spanners */}
      {hairpinPaths}
      {substaffHairpinPaths}

      {/* Barline Measure Numbers */}
      {barlineMeasureNodes}

      {/* Visual Selection Box */}
      {selectionBox}

      {/* Staff Lyrics (TASK-18) */}
      {lyricsLayout.syllables.map((syl, sIdx) => (
        <text
          key={`lyric-syl-${syl.verseIndex}-${syl.elementId}-${sIdx}`}
          data-testid="staff-lyric-syllable"
          data-verse={syl.verseIndex}
          x={syl.x}
          y={syl.y}
          textAnchor="middle"
          fontFamily={fonts?.staffLyrics?.family || 'Times New Roman'}
          fontSize={`${(fonts?.staffLyrics?.sizePt ?? 11) * scale}pt`}
          fontWeight={fonts?.staffLyrics?.bold ? 'bold' : 'normal'}
          fontStyle={fonts?.staffLyrics?.italic ? 'italic' : 'normal'}
          className="fill-slate-800 select-none"
        >
          {syl.text}
        </text>
      ))}

      {lyricsLayout.hyphens.map((hyp, hIdx) => (
        <text
          key={`lyric-hyp-${hyp.verseIndex}-${hIdx}`}
          data-testid="staff-lyric-hyphen"
          data-verse={hyp.verseIndex}
          x={hyp.x}
          y={hyp.y}
          textAnchor="middle"
          fontFamily={fonts?.staffLyrics?.family || 'Times New Roman'}
          fontSize={`${(fonts?.staffLyrics?.sizePt ?? 11) * scale}pt`}
          fontWeight={fonts?.staffLyrics?.bold ? 'bold' : 'normal'}
          fontStyle={fonts?.staffLyrics?.italic ? 'italic' : 'normal'}
          className="fill-slate-800 select-none"
        >
          -
        </text>
      ))}

      {/* Active Cursor and Ghost Note */}
      {isActive && (
        <>
          <CursorSvg x={cursorX} centerY={centerY} scale={scale} />
          <GhostNoteSvg x={cursorX + 6 * scale} centerY={centerY} diatonicOffset={pitchOffset} scale={scale} />
        </>
      )}
    </svg>
  );
};
