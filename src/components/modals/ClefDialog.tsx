import React, { useState } from 'react';
import { ClefType } from '../../types/score';
import { X, Music } from 'lucide-react';

export interface ClefDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertClef: (clefType: ClefType) => void;
  initialClef?: ClefType;
}

const CLEF_OPTIONS: { type: ClefType; name: string; glyph: string; desc: string }[] = [
  { type: 'treble', name: 'Treble Clef', glyph: '𝄞', desc: 'G Clef (2nd line)' },
  { type: 'bass', name: 'Bass Clef', glyph: '𝄢', desc: 'F Clef (4th line)' },
  { type: 'alto', name: 'Alto Clef', glyph: '𝄡', desc: 'C Clef (3rd line)' },
  { type: 'tenor', name: 'Tenor Clef', glyph: '𝄡', desc: 'C Clef (4th line)' },
];

export const ClefDialog: React.FC<ClefDialogProps> = ({
  isOpen,
  onClose,
  onInsertClef,
  initialClef = 'treble',
}) => {
  const [selectedClef, setSelectedClef] = useState<ClefType>(initialClef);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInsertClef(selectedClef);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print print:hidden"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      data-testid="clef-dialog"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Music className="w-5 h-5 text-blue-400" />
            <span>Insert Clef</span>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {CLEF_OPTIONS.map((c) => {
              const isSelected = selectedClef === c.type;
              return (
                <button
                  type="button"
                  key={c.type}
                  onClick={() => setSelectedClef(c.type)}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                  }`}
                  data-testid={`clef-option-${c.type}`}
                >
                  <span className="text-3xl leading-none">{c.glyph}</span>
                  <span className="text-xs font-bold">{c.name}</span>
                  <span className="text-[10px] text-slate-500">{c.desc}</span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
              data-testid="insert-clef-submit"
            >
              Insert Clef
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
