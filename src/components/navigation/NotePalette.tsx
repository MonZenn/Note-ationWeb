import React from 'react';
import { EntryState } from '../../hooks/useKeyboardShortcuts';
import { DurationValue, AccidentalType, FlowMarkType, MusicElement } from '../../types/score';
import { ScoreAction, SelectionRange } from '../../state/scoreStore';
import { MUSIC_GLYPHS } from '../../utils/musicGlyphs';

interface Props {
  entryState: EntryState;
  setEntryState: React.Dispatch<React.SetStateAction<EntryState>>;
  onInsertBar: () => void;
  onToggleAttribute?: (attribute: 'tieOut' | 'slurOut' | 'staccato' | 'tenuto' | 'accent') => void;
  onOpenClef?: () => void;
  onOpenKey?: () => void;
  onOpenTime?: () => void;
  onOpenText?: () => void;
  onOpenRepeat?: () => void;
  onInsertRepeatBar?: (barType: 'repeat-start' | 'repeat-end') => void;
  onOpenFlow?: () => void;
  onInsertFlowMark?: (mark: FlowMarkType) => void;
  onOpenExpression?: () => void;
  onOpenTempo?: () => void;
  activeElement?: MusicElement | null;
  selectedRange?: SelectionRange | null;
  dispatch?: React.Dispatch<ScoreAction>;
  autoBeaming?: boolean;
}

export const DurationIcon: React.FC<{ duration: DurationValue; className?: string }> = ({
  duration,
  className = 'w-3.5 h-3.5 inline-block shrink-0',
}) => {
  switch (duration) {
    case 1:
      return (
        <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" data-testid="duration-icon-1">
          <ellipse cx="8" cy="8" rx="6" ry="3.5" transform="rotate(-22 8 8)" strokeWidth="1.8" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" data-testid="duration-icon-2">
          <ellipse cx="6" cy="11" rx="4.8" ry="3" transform="rotate(-22 6 11)" strokeWidth="1.6" />
          <line x1="9.8" y1="10" x2="9.8" y2="2" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 4:
      return (
        <svg viewBox="0 0 16 16" className={className} fill="currentColor" stroke="currentColor" data-testid="duration-icon-4">
          <ellipse cx="6" cy="11" rx="4.8" ry="3.2" transform="rotate(-22 6 11)" stroke="none" />
          <line x1="9.8" y1="10" x2="9.8" y2="2" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 8:
      return (
        <svg viewBox="0 0 16 16" className={className} fill="currentColor" stroke="currentColor" data-testid="duration-icon-8">
          <ellipse cx="5.5" cy="11" rx="4.5" ry="3" transform="rotate(-22 5.5 11)" stroke="none" />
          <line x1="9" y1="10" x2="9" y2="2" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 9 2 C 12 3.5, 13 6, 11.5 8.5" fill="none" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 16:
      return (
        <svg viewBox="0 0 16 16" className={className} fill="currentColor" stroke="currentColor" data-testid="duration-icon-16">
          <ellipse cx="5.5" cy="11.5" rx="4.5" ry="3" transform="rotate(-22 5.5 11.5)" stroke="none" />
          <line x1="9" y1="10.5" x2="9" y2="1.5" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 9 1.5 C 12 3, 13 5, 11.5 7" fill="none" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 9 4.5 C 12 6, 13 8, 11.5 10" fill="none" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 32:
      return (
        <svg viewBox="0 0 16 16" className={className} fill="currentColor" stroke="currentColor" data-testid="duration-icon-32">
          <ellipse cx="5.5" cy="12" rx="4.5" ry="3" transform="rotate(-22 5.5 12)" stroke="none" />
          <line x1="9" y1="11" x2="9" y2="1" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 9 1 C 12 2.2, 13 3.8, 11.5 5.5" fill="none" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M 9 3.8 C 12 5, 13 6.6, 11.5 8.3" fill="none" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M 9 6.6 C 12 7.8, 13 9.4, 11.5 11.1" fill="none" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
};

export const NotePalette: React.FC<Props> = ({
  entryState,
  setEntryState,
  onInsertBar,
  onToggleAttribute,
  onOpenClef,
  onOpenKey,
  onOpenTime,
  onOpenText,
  onOpenTempo,
  onOpenRepeat,
  onInsertRepeatBar,
  onOpenFlow,
  onInsertFlowMark,
  onOpenExpression,
  activeElement,
  selectedRange,
  dispatch,
  autoBeaming,
}) => {
  const hasActiveSelection = Boolean(selectedRange && selectedRange.startIndex !== selectedRange.endIndex);

  const isStaccatoActive = activeElement?.type === 'note' && Boolean(activeElement.staccato);
  const isTenutoActive = activeElement?.type === 'note' && Boolean(activeElement.tenuto);
  const isAccentActive = activeElement?.type === 'note' && Boolean(activeElement.accent);

  const durations: {
    duration: DurationValue;
    val: DurationValue;
    label: string;
    shortcut: string;
  }[] = [
    { duration: 1, val: 1, label: 'Whole', shortcut: '1' },
    { duration: 2, val: 2, label: 'Half', shortcut: '2' },
    { duration: 4, val: 4, label: 'Quarter', shortcut: '3' },
    { duration: 8, val: 8, label: 'Eighth', shortcut: '4' },
    { duration: 16, val: 16, label: '16th', shortcut: '5' },
    { duration: 32, val: 32, label: '32nd', shortcut: '6' },
  ];

  const handleDurationClick = (val: DurationValue) => {
    if (hasActiveSelection) {
      dispatch?.({ type: 'BATCH_SET_DURATION', duration: val });
    }
    setEntryState((prev) => ({ ...prev, duration: val }));
  };

  const handleDotClick = () => {
    if (hasActiveSelection) {
      dispatch?.({ type: 'BATCH_TOGGLE_DOT' });
    }
    setEntryState((prev) => ({ ...prev, dots: (prev.dots + 1) % 3 }));
  };

  const handleAccidentalClick = (acc: AccidentalType) => {
    if (hasActiveSelection) {
      dispatch?.({ type: 'BATCH_SET_ACCIDENTAL', accidental: acc });
    }
    setEntryState((prev) => ({
      ...prev,
      accidental: prev.accidental === acc ? undefined : acc,
    }));
  };

  const handleToggleAttribute = (attribute: 'tieOut' | 'slurOut' | 'staccato' | 'tenuto' | 'accent') => {
    if (hasActiveSelection) {
      if (attribute === 'slurOut') {
        dispatch?.({ type: 'TOGGLE_SLUR_RANGE' });
      } else if (attribute === 'staccato' || attribute === 'tenuto' || attribute === 'accent') {
        dispatch?.({ type: 'BATCH_TOGGLE_NOTE_EXPRESSION', expression: attribute });
      } else {
        dispatch?.({ type: 'BATCH_TOGGLE_ATTRIBUTE', attribute });
      }
    } else {
      if (onToggleAttribute) {
        onToggleAttribute(attribute);
      } else if (attribute === 'staccato' || attribute === 'tenuto' || attribute === 'accent') {
        dispatch?.({ type: 'TOGGLE_NOTE_EXPRESSION', expression: attribute });
      }
    }
    if (attribute === 'slurOut') {
      setEntryState((prev) => ({ ...prev, slurOut: !prev.slurOut }));
    } else if (attribute === 'tieOut') {
      setEntryState((prev) => ({ ...prev, tieOut: !prev.tieOut }));
    }
  };


  return (
    <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-col gap-1.5 text-xs font-medium select-none no-print print:hidden">
      {/* Row 1: Durations, Augmentation, Accidentals, Articulations & Expression */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Durations Group */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded-md p-0.5 shadow-xs">
          {durations.map((d) => (
            <button
              key={d.duration}
              type="button"
              onClick={() => handleDurationClick(d.duration)}
              className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors flex items-center gap-1.5 ${
                entryState.duration === d.duration
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              data-testid={`duration-${d.duration}`}
            >
              <DurationIcon duration={d.duration} />
              <span>{d.label} ({d.shortcut})</span>
            </button>
          ))}

          {/* Dot */}
          <div className="h-4 w-px bg-slate-200 mx-0.5" />
          <button
            type="button"
            onClick={handleDotClick}
            className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
              entryState.dots > 0
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            data-testid="dot-button"
          >
            Dot (.) {entryState.dots > 0 ? `(${entryState.dots})` : ''}
          </button>
        </div>

        {/* Accidentals Group */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded-md p-0.5 shadow-xs">
          {(['natural', 'flat', 'sharp'] as const).map((acc) => (
            <button
              key={acc}
              type="button"
              onClick={() => handleAccidentalClick(acc)}
              className={`px-2 py-1 rounded text-xs capitalize cursor-pointer transition-colors ${
                entryState.accidental === acc
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              data-testid={`accidental-${acc}`}
            >
              {acc === 'natural' ? '♮ (7)' : acc === 'flat' ? '♭ (8)' : '♯ (9)'}
            </button>
          ))}
        </div>

        {/* Ties, Slurs & Beaming Group */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded-md p-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => handleToggleAttribute('slurOut')}
            className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
              entryState.slurOut
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Slur (/)"
            data-testid="btn-slur"
          >
            Slur (/)
          </button>

          <button
            type="button"
            onClick={() => handleToggleAttribute('tieOut')}
            className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
              entryState.tieOut
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Tie (;)"
            data-testid="btn-tie"
          >
            Tie (;)
          </button>

          <button
            type="button"
            onClick={() => {
              if (hasActiveSelection) {
                dispatch?.({ type: 'BATCH_TOGGLE_BEAM' });
              } else {
                dispatch?.({ type: 'TOGGLE_BEAM' });
              }
            }}
            className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors"
            title="Toggle Beam (B)"
            data-testid="btn-beam"
          >
            Beam (B)
          </button>

          <button
            type="button"
            onClick={() => dispatch?.({ type: 'TOGGLE_AUTO_BEAMING' })}
            className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
              autoBeaming
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Toggle Auto-Beaming"
            data-testid="btn-auto-beam"
          >
            Auto Beam
          </button>

          <button
            type="button"
            onClick={() => dispatch?.({ type: 'BATCH_TOGGLE_TUPLET', actual: 3, normal: 2 })}
            className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors font-semibold"
            title="Toggle Triplet 3:2 (Shift+T)"
            data-testid="btn-triplet"
          >
            Triplet (3)
          </button>
        </div>

        {/* Articulations & Expression Dialog */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded-md p-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => handleToggleAttribute('staccato')}
            className={`w-7 h-6 rounded flex items-center justify-center text-sm font-black cursor-pointer transition-colors ${
              isStaccatoActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Staccato (,)"
            data-testid="btn-staccato"
          >
            ·
          </button>

          <button
            type="button"
            onClick={() => handleToggleAttribute('tenuto')}
            className={`w-7 h-6 rounded flex items-center justify-center text-sm font-black cursor-pointer transition-colors ${
              isTenutoActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Tenuto (_)"
            data-testid="btn-tenuto"
          >
            -
          </button>

          <button
            type="button"
            onClick={() => handleToggleAttribute('accent')}
            className={`w-7 h-6 rounded flex items-center justify-center text-sm font-black cursor-pointer transition-colors ${
              isAccentActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Accent"
            data-testid="btn-accent"
          >
            &gt;
          </button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          <button
            type="button"
            onClick={() => onOpenExpression?.()}
            className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold cursor-pointer transition-colors flex items-center gap-1"
            title="Expression & Ornaments (X)"
            data-testid="btn-expression"
          >
            ✦ Expression (X)
          </button>
        </div>
      </div>

      {/* Row 2: Dynamics, Score Signatures, Barlines & Flow Marks */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Dynamics & Hairpins Group */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded-md p-0.5 shadow-xs">
          {(['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz', 'fz'] as const).map((mark) => (
            <button
              key={mark}
              type="button"
              onClick={() => {
                dispatch?.({
                  type: 'INSERT_ELEMENT',
                  element: {
                    id: `dynamic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    type: 'dynamic',
                    mark,
                  },
                });
              }}
              className="px-1.5 py-0.5 min-w-[24px] text-center rounded text-slate-800 font-serif italic font-bold hover:bg-slate-100 cursor-pointer transition-colors text-xs"
              title={`Insert Dynamic ${mark}`}
              data-testid={`btn-dynamic-${mark}`}
            >
              {mark}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          <button
            type="button"
            onClick={() => {
              dispatch?.({ type: 'TOGGLE_HAIRPIN_RANGE', hairpinType: 'crescendo' });
            }}
            className="px-1.5 py-0.5 rounded text-slate-800 font-bold hover:bg-slate-100 cursor-pointer transition-colors text-xs"
            title="Crescendo Hairpin (<)"
            data-testid="btn-hairpin-crescendo"
          >
            &lt;
          </button>

          <button
            type="button"
            onClick={() => {
              dispatch?.({ type: 'TOGGLE_HAIRPIN_RANGE', hairpinType: 'decrescendo' });
            }}
            className="px-1.5 py-0.5 rounded text-slate-800 font-bold hover:bg-slate-100 cursor-pointer transition-colors text-xs"
            title="Decrescendo Hairpin (>)"
            data-testid="btn-hairpin-decrescendo"
          >
            &gt;
          </button>
        </div>

        {/* Structural Score Elements Group */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded-md p-0.5 shadow-xs">
          {onOpenClef && (
            <button
              type="button"
              onClick={onOpenClef}
              className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold cursor-pointer transition-colors"
              title="Insert Clef (C)"
              data-testid="btn-clef"
            >
              Clef (C)
            </button>
          )}

          {onOpenKey && (
            <button
              type="button"
              onClick={onOpenKey}
              className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold cursor-pointer transition-colors"
              title="Insert Key Signature (K)"
              data-testid="btn-key"
            >
              Key (K)
            </button>
          )}

          {onOpenTime && (
            <button
              type="button"
              onClick={onOpenTime}
              className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold cursor-pointer transition-colors"
              title="Insert Time Signature (Shift+T)"
              data-testid="btn-time"
            >
              Time (Shift+T)
            </button>
          )}

          {onOpenText && (
            <button
              type="button"
              onClick={onOpenText}
              className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold cursor-pointer transition-colors flex items-center gap-1"
              title="Text / Chord (T)"
              data-testid="palette-text"
            >
              <span className="font-serif font-bold text-sm leading-none">Aa</span>
              <span>Text</span>
            </button>
          )}

          {onOpenTempo && (
            <button
              type="button"
              onClick={onOpenTempo}
              className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold cursor-pointer transition-colors flex items-center gap-1"
              title="Insert Tempo (Alt+T)"
              data-testid="btn-tempo"
            >
              <span className="leading-none">⏱️</span>
              <span>Tempo</span>
            </button>
          )}
        </div>

        {/* Barlines, Repeats & Flow Marks Group */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded-md p-0.5 shadow-xs">
          <button
            type="button"
            onClick={onInsertBar}
            className="px-2.5 py-1 rounded text-xs text-slate-800 font-bold hover:bg-slate-100 cursor-pointer transition-colors"
            data-testid="btn-barline"
            title="Insert Standard Barline (Tab)"
          >
            Bar Line (Tab)
          </button>

          {onInsertRepeatBar && (
            <>
              <button
                type="button"
                onClick={() => onInsertRepeatBar('repeat-start')}
                className="px-2 py-1 rounded text-xs text-slate-800 font-bold hover:bg-slate-100 cursor-pointer transition-colors"
                title="Start Repeat (|:)"
                data-testid="btn-repeat-start"
              >
                |:
              </button>
              <button
                type="button"
                onClick={() => onInsertRepeatBar('repeat-end')}
                className="px-2 py-1 rounded text-xs text-slate-800 font-bold hover:bg-slate-100 cursor-pointer transition-colors"
                title="End Repeat (:|)"
                data-testid="btn-repeat-end"
              >
                :|
              </button>
            </>
          )}

          {onOpenRepeat && (
            <button
              type="button"
              onClick={onOpenRepeat}
              className="px-2 py-1 rounded text-xs text-slate-800 font-semibold hover:bg-slate-100 cursor-pointer transition-colors"
              title="Repeats & Endings Dialog (R)"
              data-testid="btn-repeat"
            >
              Repeat (R)
            </button>
          )}

          {onInsertFlowMark && (
            <>
              <button
                type="button"
                onClick={() => onInsertFlowMark('segno')}
                className="w-7 h-6 rounded text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                title="Insert Segno"
                data-testid="btn-flow-segno"
                aria-label="Insert Segno"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-slate-800"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={MUSIC_GLYPHS.segno} />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onInsertFlowMark('coda')}
                className="w-7 h-6 rounded text-slate-800 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                title="Insert Coda"
                data-testid="btn-flow-coda"
                aria-label="Insert Coda"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-slate-800"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={MUSIC_GLYPHS.coda} />
                </svg>
              </button>
            </>
          )}

          {onOpenFlow && (
            <button
              type="button"
              onClick={onOpenFlow}
              className="px-2 py-1 rounded text-xs text-slate-800 font-semibold hover:bg-slate-100 cursor-pointer transition-colors"
              title="Musical Flow Navigation Dialog (F)"
              data-testid="btn-flow"
            >
              Flow (F)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
