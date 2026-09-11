import React, { useState } from 'react';
import { BarType } from '../../types/score';
import { X, Repeat } from 'lucide-react';

export interface RepeatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertBar: (barType: BarType) => void;
  onInsertVolta: (endings: number[], text?: string, closed?: boolean) => void;
}

const BAR_OPTIONS: { type: BarType; label: string; symbol: string; desc: string }[] = [
  { type: 'repeat-start', label: 'Start Repeat', symbol: '|:', desc: 'Begin repeated section' },
  { type: 'repeat-end', label: 'End Repeat', symbol: ':|', desc: 'Loop back to start' },
  { type: 'repeat-both', label: 'Double Repeat', symbol: ':|:', desc: 'End and start repeat' },
  { type: 'final', label: 'Final Bar', symbol: '𝄂', desc: 'End of piece' },
  { type: 'double', label: 'Double Bar', symbol: '||', desc: 'Section boundary' },
  { type: 'single', label: 'Single Bar', symbol: '|', desc: 'Standard measure line' },
];

const VOLTA_PRESETS: { id: string; label: string; endings: number[]; text: string; closed: boolean }[] = [
  { id: '1', label: '1st Ending (1.)', endings: [1], text: '1.', closed: true },
  { id: '2', label: '2nd Ending (2.)', endings: [2], text: '2.', closed: false },
  { id: '1-2', label: '1st & 2nd (1, 2.)', endings: [1, 2], text: '1, 2.', closed: true },
  { id: '3', label: '3rd Ending (3.)', endings: [3], text: '3.', closed: false },
];

export const RepeatDialog: React.FC<RepeatDialogProps> = ({
  isOpen,
  onClose,
  onInsertBar,
  onInsertVolta,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('1');
  const [customEndings, setCustomEndings] = useState<string>('1');
  const [customText, setCustomText] = useState<string>('1.');
  const [isClosed, setIsClosed] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof VOLTA_PRESETS[0]) => {
    setSelectedPresetId(preset.id);
    setCustomEndings(preset.endings.join(', '));
    setCustomText(preset.text);
    setIsClosed(preset.closed);
  };

  const handleVoltaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedEndings = customEndings
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const endings = parsedEndings.length > 0 ? parsedEndings : [1];
    const text = customText.trim() || undefined;
    onInsertVolta(endings, text, isClosed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print print:hidden"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      data-testid="repeat-dialog"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Repeat className="w-5 h-5 text-blue-400" />
            <span>Repeats & Endings</span>
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

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Section 1: Repeat Barlines */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Insert Repeat Barline
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              {BAR_OPTIONS.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => {
                    onInsertBar(b.type);
                    onClose();
                  }}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group text-center"
                  data-testid={`bar-option-${b.type}`}
                >
                  <span className="font-mono text-xl font-bold text-slate-800 group-hover:text-blue-600">
                    {b.symbol}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">{b.label}</span>
                  <span className="text-[10px] text-slate-400">{b.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Section 2: Volta / Ending Brackets */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Insert Ending Bracket (Volta)
            </h3>
            <form onSubmit={handleVoltaSubmit} className="space-y-4">
              {/* Presets */}
              <div className="grid grid-cols-2 gap-2">
                {VOLTA_PRESETS.map((p) => {
                  const isSelected = selectedPresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`px-3 py-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                      }`}
                      data-testid={`volta-preset-${p.id}`}
                    >
                      <div>{p.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {p.closed ? 'Closed hook' : 'Open bracket'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom fields */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ending Pass(es) (e.g. 1, 2)
                  </label>
                  <input
                    type="text"
                    value={customEndings}
                    onChange={(e) => setCustomEndings(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="1, 2"
                    data-testid="volta-endings-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Bracket Text Label
                  </label>
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="1."
                    data-testid="volta-text-input"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="volta-closed-cb"
                  checked={isClosed}
                  onChange={(e) => setIsClosed(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  data-testid="volta-closed-checkbox"
                />
                <label htmlFor="volta-closed-cb" className="text-xs text-slate-700 cursor-pointer select-none">
                  Closed bracket (render downward hook at right edge)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-sm cursor-pointer transition-colors"
                  data-testid="insert-volta-submit"
                >
                  Insert Ending Bracket
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
