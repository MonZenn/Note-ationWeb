import React, { useState, useEffect } from 'react';
import { X, Hash, ArrowRight, Info, CheckCircle2 } from 'lucide-react';
import { analyzeKeySignatureChange } from '../../engine/layout/geometry';

export interface KeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertKey: (
    key: string,
    accidentalsCount: number,
    cancelCount?: number,
    cancelType?: 'sharp' | 'flat',
    cancelIndices?: number[]
  ) => void;
  initialAccidentals?: number;
}

interface KeyDefinition {
  accidentalsCount: number; // positive = sharps, negative = flats, 0 = natural
  name: string;
  major: string;
  minor: string;
  accidentalsList: string[];
}

const SHARP_NAMES = ['F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'E♯', 'B♯'];
const FLAT_NAMES = ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭', 'F♭'];

const KEY_DEFINITIONS: KeyDefinition[] = [
  // Flats (-7 to -1)
  { accidentalsCount: -7, name: '7 Flats (C♭ / A♭m)', major: 'C♭ Major', minor: 'A♭ Minor', accidentalsList: FLAT_NAMES.slice(0, 7) },
  { accidentalsCount: -6, name: '6 Flats (G♭ / E♭m)', major: 'G♭ Major', minor: 'E♭ Minor', accidentalsList: FLAT_NAMES.slice(0, 6) },
  { accidentalsCount: -5, name: '5 Flats (D♭ / B♭m)', major: 'D♭ Major', minor: 'B♭ Minor', accidentalsList: FLAT_NAMES.slice(0, 5) },
  { accidentalsCount: -4, name: '4 Flats (A♭ / Fm)', major: 'A♭ Major', minor: 'F Minor', accidentalsList: FLAT_NAMES.slice(0, 4) },
  { accidentalsCount: -3, name: '3 Flats (E♭ / Cm)', major: 'E♭ Major', minor: 'C Minor', accidentalsList: FLAT_NAMES.slice(0, 3) },
  { accidentalsCount: -2, name: '2 Flats (B♭ / Gm)', major: 'B♭ Major', minor: 'G Minor', accidentalsList: FLAT_NAMES.slice(0, 2) },
  { accidentalsCount: -1, name: '1 Flat (F / Dm)', major: 'F Major', minor: 'D Minor', accidentalsList: FLAT_NAMES.slice(0, 1) },
  // Neutral (0)
  { accidentalsCount: 0, name: 'Natural (C / Am)', major: 'C Major', minor: 'A Minor', accidentalsList: [] },
  // Sharps (1 to 7)
  { accidentalsCount: 1, name: '1 Sharp (G / Em)', major: 'G Major', minor: 'E Minor', accidentalsList: SHARP_NAMES.slice(0, 1) },
  { accidentalsCount: 2, name: '2 Sharps (D / Bm)', major: 'D Major', minor: 'B Minor', accidentalsList: SHARP_NAMES.slice(0, 2) },
  { accidentalsCount: 3, name: '3 Sharps (A / F♯m)', major: 'A Major', minor: 'F♯ Minor', accidentalsList: SHARP_NAMES.slice(0, 3) },
  { accidentalsCount: 4, name: '4 Sharps (E / C♯m)', major: 'E Major', minor: 'C♯ Minor', accidentalsList: SHARP_NAMES.slice(0, 4) },
  { accidentalsCount: 5, name: '5 Sharps (B / G♯m)', major: 'B Major', minor: 'G♯ Minor', accidentalsList: SHARP_NAMES.slice(0, 5) },
  { accidentalsCount: 6, name: '6 Sharps (F♯ / D♯m)', major: 'F♯ Major', minor: 'D♯ Minor', accidentalsList: SHARP_NAMES.slice(0, 6) },
  { accidentalsCount: 7, name: '7 Sharps (C♯ / A♯m)', major: 'C♯ Major', minor: 'A♯ Minor', accidentalsList: SHARP_NAMES.slice(0, 7) },
];

export const KeyDialog: React.FC<KeyDialogProps> = ({
  isOpen,
  onClose,
  onInsertKey,
  initialAccidentals = 0,
}) => {
  const [selectedAccidentals, setSelectedAccidentals] = useState<number>(initialAccidentals);

  useEffect(() => {
    if (isOpen) {
      setSelectedAccidentals(initialAccidentals);
    }
  }, [isOpen, initialAccidentals]);

  if (!isOpen) return null;

  const currentDef =
    KEY_DEFINITIONS.find((k) => k.accidentalsCount === selectedAccidentals) || KEY_DEFINITIONS[7];
  const initialDef =
    KEY_DEFINITIONS.find((k) => k.accidentalsCount === initialAccidentals) || KEY_DEFINITIONS[7];

  const isKeyChange = initialAccidentals !== selectedAccidentals;
  const analysis = analyzeKeySignatureChange(initialAccidentals, selectedAccidentals);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (analysis.cancelCount > 0) {
      onInsertKey(
        currentDef.major,
        currentDef.accidentalsCount,
        analysis.cancelCount,
        analysis.cancelType,
        analysis.cancelIndices
      );
    } else {
      onInsertKey(currentDef.major, currentDef.accidentalsCount);
    }
    onClose();
  };

  const symbol = selectedAccidentals > 0 ? '♯' : selectedAccidentals < 0 ? '♭' : '♮';
  const countAbs = Math.abs(selectedAccidentals);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print print:hidden"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      data-testid="key-dialog"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Hash className="w-5 h-5 text-blue-400" />
            <span>Key Signature</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Key Transition Indicator (if changing key) */}
          {isKeyChange && (
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg space-y-2 text-xs text-blue-950">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-slate-700">Current: {initialDef.major}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-blue-700">New: {currentDef.major}</span>
                </div>
                {analysis.cancelCount > 0 && (
                  <span className="text-slate-600 font-medium">
                    ({analysis.cancelCount} ♮ cancelling naturals will be engraved)
                  </span>
                )}
              </div>

              {/* Breakdown of notes that became natural vs sharp vs flat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] border-t border-blue-200/60">
                {analysis.cancelledNotes.length > 0 && (
                  <div className="flex items-start gap-1.5 bg-amber-50/80 border border-amber-200 rounded p-1.5 text-amber-900">
                    <span className="font-bold text-amber-800 shrink-0">Became ♮:</span>
                    <span className="font-mono font-medium">
                      {analysis.cancelledNotes.map((n) => `${n.pitch}♮`).join(', ')}
                    </span>
                  </div>
                )}
                {analysis.newNotes.length > 0 && (
                  <div className="flex items-start gap-1.5 bg-blue-100/70 border border-blue-200 rounded p-1.5 text-blue-900">
                    <span className="font-bold text-blue-800 shrink-0">
                      New {selectedAccidentals > 0 ? '♯' : '♭'}:
                    </span>
                    <span className="font-mono font-medium">
                      {analysis.newNotes.map((n) => `${n.pitch}${selectedAccidentals > 0 ? '♯' : '♭'}`).join(', ')}
                    </span>
                  </div>
                )}
                {analysis.retainedNotes.length > 0 && (
                  <div className="flex items-start gap-1.5 bg-emerald-50/80 border border-emerald-200 rounded p-1.5 text-emerald-900 col-span-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-emerald-800">Retained: </strong>
                      {analysis.retainedNotes.map((n) => `${n.pitch}${n.type === 'sharp' ? '♯' : '♭'}`).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Circle of Fifths Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
              Circle of Fifths Quick Select
            </label>
            <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
              {KEY_DEFINITIONS.map((k) => {
                const isSelected = k.accidentalsCount === selectedAccidentals;
                const shortLabel =
                  k.accidentalsCount === 0
                    ? 'C'
                    : k.accidentalsCount > 0
                    ? `${k.accidentalsCount}♯ ${k.major.split(' ')[0]}`
                    : `${Math.abs(k.accidentalsCount)}♭ ${k.major.split(' ')[0]}`;

                return (
                  <button
                    key={k.accidentalsCount}
                    type="button"
                    onClick={() => setSelectedAccidentals(k.accidentalsCount)}
                    className={`px-2 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                    data-testid={`key-chip-${k.accidentalsCount}`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key Selection Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Select Key Signature
            </label>
            <select
              value={selectedAccidentals}
              onChange={(e) => setSelectedAccidentals(parseInt(e.target.value, 10))}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="key-signature-select"
            >
              <optgroup label="Neutral">
                <option value={0}>C Major / A Minor (No accidentals)</option>
              </optgroup>
              <optgroup label="Sharp Keys (♯)">
                {KEY_DEFINITIONS.filter((k) => k.accidentalsCount > 0).map((k) => (
                  <option key={k.accidentalsCount} value={k.accidentalsCount}>
                    {k.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Flat Keys (♭)">
                {KEY_DEFINITIONS.filter((k) => k.accidentalsCount < 0).map((k) => (
                  <option key={k.accidentalsCount} value={k.accidentalsCount}>
                    {k.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Visual Preview Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Preview
            </div>
            <div className="text-2xl font-black text-slate-800 tracking-wider h-8 flex items-center justify-center gap-1.5">
              {isKeyChange && analysis.cancelCount > 0 && (
                <div className="flex items-center text-slate-400 font-serif" title="Cancelling naturals">
                  {Array.from({ length: analysis.cancelCount }).map((_, i) => (
                    <span key={`cancel-${i}`} className="mx-0.5">
                      ♮
                    </span>
                  ))}
                </div>
              )}
              {countAbs === 0 && (!isKeyChange || analysis.cancelCount === 0) ? (
                <span className="text-slate-400 font-mono text-sm">No accidentals (C / Am)</span>
              ) : (
                <div className="flex items-center text-blue-700 font-serif">
                  {Array.from({ length: countAbs }).map((_, i) => (
                    <span key={`active-${i}`} className="mx-0.5">
                      {symbol}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-xs font-bold text-slate-700">
              {currentDef.major} / {currentDef.minor}
            </div>
            {currentDef.accidentalsList.length > 0 && (
              <div className="text-[11px] text-slate-500 font-mono">
                {currentDef.accidentalsList.join('  ')}
              </div>
            )}
          </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-sm cursor-pointer transition-colors"
              data-testid="insert-key-submit"
            >
              {isKeyChange ? 'Apply Key Signature' : 'Insert Key Signature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

