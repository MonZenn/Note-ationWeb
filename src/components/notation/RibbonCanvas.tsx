import React, { useState, useRef, useEffect } from 'react';
import { Score, TextElement, TempoElement, KeySignatureElement, ClefElement, Staff } from '../../types/score';
import { StaffSvg } from './StaffSvg';
import { computeSynchronizedScoreLayout } from '../../engine/layout/ribbon';
import { computeScoreMeasureNumbers } from '../../engine/layout/geometry';
import { Pencil, Check } from 'lucide-react';

interface Props {
  score: Score;
  activeStaffIndex: number;
  cursorIndex: number;
  pitchOffset: number;
  onSelectStaff: (index: number) => void;
  onStaffClick: (elementIndex: number, pitchOffset: number) => void;
  selectedRange?: { startIndex: number; endIndex: number } | null;
  onRangeSelect?: (range: { startIndex: number; endIndex: number } | null, anchorIndex?: number) => void;
  onTextClick?: (element: TextElement, staffIndex: number) => void;
  onTempoClick?: (element: TempoElement, staffIndex: number) => void;
  onKeyClick?: (element: KeySignatureElement, staffIndex: number) => void;
  onClefClick?: (element: ClefElement, staffIndex: number) => void;
  onUpdateStaff?: (index: number, updates: Partial<Staff>) => void;
  isPlaying?: boolean;
  playbackCursor?: { staffIndex: number; elementIndex: number } | null;
}

export const RibbonCanvas: React.FC<Props> = ({
  score,
  activeStaffIndex,
  cursorIndex,
  pitchOffset,
  onSelectStaff,
  onStaffClick,
  selectedRange,
  onRangeSelect,
  onTextClick,
  onTempoClick,
  onKeyClick,
  onClefClick,
  onUpdateStaff,
  isPlaying = false,
  playbackCursor = null,
}) => {
  const [editingStaffIndex, setEditingStaffIndex] = useState<number | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const staffRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleStartRename = (idx: number, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStaffIndex(idx);
    setEditNameValue(currentName);
  };

  const handleSaveRename = (idx: number) => {
    if (onUpdateStaff && editNameValue.trim()) {
      onUpdateStaff(idx, { name: editNameValue.trim() });
    }
    setEditingStaffIndex(null);
  };

  const synchronizedPositions = computeSynchronizedScoreLayout(score);
  const measureInfos = computeScoreMeasureNumbers(score);
  const maxElements = Math.max(0, ...score.staves.map((s) => s.elements.length));
  const maxStaffWidth = Math.max(
    0,
    ...synchronizedPositions.map((positions) =>
      positions.length > 0 ? positions[positions.length - 1].x + positions[positions.length - 1].width : 0
    )
  );
  const canvasWidth = Math.max(1600, maxElements * 40 + 400, maxStaffWidth + 200);

  // Auto-scroll on staff editing (cursor navigation, note entry, selection)
  useEffect(() => {
    if (isPlaying || playbackCursor) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const activeStaffPositions = synchronizedPositions[activeStaffIndex] || [];
    const cursorX = cursorIndex === 0
      ? 75
      : (activeStaffPositions[cursorIndex - 1]?.x || 75) + (activeStaffPositions[cursorIndex - 1]?.width || 36);

    const leftVisible = container.scrollLeft;
    const rightVisible = leftVisible + container.clientWidth;
    const padding = 140;

    if (cursorX > rightVisible - padding) {
      container.scrollTo({
        left: cursorX - container.clientWidth + padding + 60,
        behavior: 'smooth',
      });
    } else if (cursorX < leftVisible + padding) {
      container.scrollTo({
        left: Math.max(0, cursorX - padding),
        behavior: 'smooth',
      });
    }

    // Auto-scroll vertical to active staff if needed
    const activeRow = staffRowRefs.current[activeStaffIndex];
    if (activeRow) {
      const rowTop = activeRow.offsetTop;
      const rowBottom = rowTop + activeRow.offsetHeight;
      const scrollTop = container.scrollTop;
      const scrollBottom = scrollTop + container.clientHeight;
      if (rowTop < scrollTop + 10) {
        container.scrollTo({ top: Math.max(0, rowTop - 10), behavior: 'smooth' });
      } else if (rowBottom > scrollBottom - 10) {
        container.scrollTo({ top: rowBottom - container.clientHeight + 10, behavior: 'smooth' });
      }
    }
  }, [cursorIndex, activeStaffIndex, score, selectedRange, isPlaying, playbackCursor, synchronizedPositions]);

  // Auto-scroll on audio playback
  useEffect(() => {
    if (!playbackCursor) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const staffPos = synchronizedPositions[playbackCursor.staffIndex] || [];
    const currentElem = staffPos[playbackCursor.elementIndex];
    if (currentElem) {
      const playX = currentElem.x + currentElem.width / 2;
      const leftVisible = container.scrollLeft;
      const rightVisible = leftVisible + container.clientWidth;
      const margin = 160;

      if (playX > rightVisible - margin || playX < leftVisible + margin) {
        container.scrollTo({
          left: Math.max(0, playX - container.clientWidth / 3),
          behavior: 'smooth',
        });
      }

      // Vertical visibility of the staff being played (anchors to parent staff if playing on a substaff)
      const playingStaff = score.staves[playbackCursor.staffIndex];
      const targetStaffIndex = playingStaff?.substaffOf
        ? score.staves.findIndex((s) => s.id === playingStaff.substaffOf)
        : playbackCursor.staffIndex;
      const effectiveIndex = targetStaffIndex !== -1 ? targetStaffIndex : playbackCursor.staffIndex;
      const playingRow = staffRowRefs.current[effectiveIndex];
      if (playingRow) {
        const rowTop = playingRow.offsetTop;
        const rowBottom = rowTop + playingRow.offsetHeight;
        const scrollTop = container.scrollTop;
        const scrollBottom = scrollTop + container.clientHeight;
        if (rowTop < scrollTop + 10) {
          container.scrollTo({ top: Math.max(0, rowTop - 10), behavior: 'smooth' });
        } else if (rowBottom > scrollBottom - 10) {
          container.scrollTo({ top: rowBottom - container.clientHeight + 10, behavior: 'smooth' });
        }
      }
    }
  }, [playbackCursor, synchronizedPositions]);

  // Playhead coordinate calculation
  let playheadX: number | null = null;
  if (playbackCursor) {
    const staffPos = synchronizedPositions[playbackCursor.staffIndex];
    const elemPos = staffPos?.[playbackCursor.elementIndex];
    if (elemPos) {
      playheadX = elemPos.x + elemPos.width / 2;
    }
  }

  return (
    <div
      ref={scrollContainerRef}
      data-testid="ribbon-scroll-container"
      className="flex-1 overflow-x-auto overflow-y-auto bg-slate-200 p-6"
    >
      <div className="relative flex items-stretch bg-white shadow-md p-6 rounded-lg min-w-max">
        {/* Playback Playhead Indicator */}
        {playheadX !== null && (
          <div
            data-testid="playback-playhead"
            className="absolute top-6 bottom-6 pointer-events-none z-20 transition-all duration-75 ease-out"
            style={{ left: `${playheadX + 24}px` }}
          >
            <div className="w-0.5 h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)] relative">
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping" />
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-blue-600 rounded-full" />
            </div>
          </div>
        )}

        <div className={`flex-1 flex flex-col gap-6 ${score.staves.length > 1 ? 'border-l-2 border-slate-700 pl-3' : ''}`}>
          {score.staves.map((staff, idx) => (
            <div
              key={staff.id}
              ref={(el) => {
                staffRowRefs.current[idx] = el;
              }}
              onClick={() => onSelectStaff(idx)}
              className="flex flex-col rounded overflow-hidden"
            >
              <div className="text-xs font-semibold text-slate-500 px-2 py-1 bg-slate-100 flex justify-between items-center group">
                <div className="flex items-center gap-2">
                  {editingStaffIndex === idx ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(idx);
                          if (e.key === 'Escape') setEditingStaffIndex(null);
                        }}
                        autoFocus
                        className="px-2 py-0.5 bg-white border border-blue-500 rounded text-xs font-bold text-slate-800 focus:outline-none shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(idx)}
                        className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
                        title="Save name"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span
                      className="flex items-center gap-1 cursor-pointer hover:text-blue-700 font-bold text-slate-700"
                      title="Click pencil to rename staff"
                      onDoubleClick={(e) => handleStartRename(idx, staff.name, e)}
                    >
                      {staff.name} ({staff.initialClef})
                      {onUpdateStaff && (
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(idx, staff.name, e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-opacity ml-1"
                          title="Rename Staff"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  )}
                  {staff.substaffOf && (
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-1 rounded ml-1">
                      Voice 2
                    </span>
                  )}
                </div>
                {idx === activeStaffIndex && <span className="text-blue-600 font-bold">Active Staff</span>}
              </div>
              <StaffSvg
                staff={staff}
                isActive={idx === activeStaffIndex}
                centerY={50}
                width={canvasWidth}
                cursorIndex={idx === activeStaffIndex ? cursorIndex : 0}
                pitchOffset={pitchOffset}
                selectedRange={idx === activeStaffIndex ? selectedRange : null}
                onRangeSelect={idx === activeStaffIndex ? onRangeSelect : undefined}
                onStaffClick={(elemIdx, pOffset) => {
                  onSelectStaff(idx);
                  onStaffClick(elemIdx, pOffset);
                }}
                positionedElements={synchronizedPositions[idx]}
                measureNumbers={idx === 0 && score.info.measureNumbering !== 'none' ? measureInfos : undefined}
                measureNumberingMode={score.info.measureNumbering}
                onTextClick={(el) => onTextClick?.(el, idx)}
                onTempoClick={(el) => onTempoClick?.(el, idx)}
                onKeyClick={(el) => onKeyClick?.(el, idx)}
                onClefClick={(el) => onClefClick?.(el, idx)}
                autoBeaming={score.info.autoBeaming === true}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

