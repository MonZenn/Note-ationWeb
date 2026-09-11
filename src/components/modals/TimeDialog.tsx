import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';

export interface TimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTime: (numerator: number, denominator: number, symbol?: 'common' | 'cut') => void;
  initialNumerator?: number;
  initialDenominator?: number;
}

interface Preset {
  label: string;
  numerator: number;
  denominator: number;
  symbol?: 'common' | 'cut';
  desc: string;
}

const PRESETS: Preset[] = [
  { label: '4/4', numerator: 4, denominator: 4, desc: 'Common Time' },
  { label: '3/4', numerator: 3, denominator: 4, desc: 'Waltz Time' },
  { label: '2/4', numerator: 2, denominator: 4, desc: 'March Time' },
  { label: '6/8', numerator: 6, denominator: 8, desc: 'Compound Duple' },
  { label: 'C', numerator: 4, denominator: 4, symbol: 'common', desc: 'Common Glyph' },
  { label: 'Cut (₵)', numerator: 2, denominator: 2, symbol: 'cut', desc: 'Alla Breve' },
];

export const TimeDialog: React.FC<TimeDialogProps> = ({
  isOpen,
  onClose,
  onInsertTime,
  initialNumerator = 4,
  initialDenominator = 4,
}) => {
  const [numerator, setNumerator] = useState<number>(initialNumerator);
  const [denominator, setDenominator] = useState<number>(initialDenominator);
  const [symbol, setSymbol] = useState<'common' | 'cut' | undefined>(undefined);

  if (!isOpen) return null;

  const handleApplyPreset = (p: Preset) => {
    setNumerator(p.numerator);
    setDenominator(p.denominator);
    setSymbol(p.symbol);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInsertTime(numerator, denominator, symbol);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print print:hidden"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      data-testid="time-dialog"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Clock className="w-5 h-5 text-blue-400" />
            <span>Insert Time Signature</span>
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
          <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              Common Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => {
                const isSelected =
                  numerator === p.numerator &&
                  denominator === p.denominator &&
                  symbol === p.symbol;

                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`p-2.5 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                    }`}
                    data-testid={`time-preset-${p.label.replace(/[^a-zA-Z0-9]/g, '')}`}
                  >
                    <span className="text-base font-black">{p.label}</span>
                    <span className="text-[10px] text-slate-500 truncate w-full text-center">
                      {p.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Numerator / Denominator Inputs */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Numerator (Beats)
              </label>
              <input
                type="number"
                min="1"
                max="32"
                value={numerator}
                onChange={(e) => {
                  setNumerator(Math.max(1, parseInt(e.target.value, 10) || 1));
                  setSymbol(undefined);
                }}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="time-numerator-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Denominator (Beat Unit)
              </label>
              <select
                value={denominator}
                onChange={(e) => {
                  setDenominator(parseInt(e.target.value, 10));
                  setSymbol(undefined);
                }}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="time-denominator-select"
              >
                <option value={1}>1 (Whole note)</option>
                <option value={2}>2 (Half note)</option>
                <option value={4}>4 (Quarter note)</option>
                <option value={8}>8 (Eighth note)</option>
                <option value={16}>16 (Sixteenth note)</option>
                <option value={32}>32 (32nd note)</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between px-6">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Signature Preview:
            </span>
            <div className="flex flex-col items-center justify-center font-bold text-slate-900 leading-none" data-testid="time-preview">
              {symbol === 'common' ? (
                <span className="text-2xl font-serif">C</span>
              ) : symbol === 'cut' ? (
                <span className="text-2xl font-serif">₵</span>
              ) : (
                <>
                  <span className="text-lg">{numerator}</span>
                  <span className="text-lg border-t border-slate-900 w-4 text-center">{denominator}</span>
                </>
              )}
            </div>
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
              data-testid="insert-time-submit"
            >
              Insert Time Signature
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
