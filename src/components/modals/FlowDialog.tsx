import React from 'react';
import { FlowMarkType } from '../../types/score';
import { MUSIC_GLYPHS } from '../../utils/musicGlyphs';
import { X, Navigation } from 'lucide-react';

export interface FlowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertFlow: (mark: FlowMarkType) => void;
}

interface FlowOption {
  mark: FlowMarkType;
  label: string;
  symbol: string;
  symbolNode?: React.ReactNode;
  desc: string;
  category: 'target' | 'jump';
}

const FLOW_OPTIONS: FlowOption[] = [
  // Targets / Sections
  {
    mark: 'segno',
    label: 'Segno',
    symbol: 'Segno',
    symbolNode: (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5 text-slate-700 group-hover:text-blue-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={MUSIC_GLYPHS.segno} />
      </svg>
    ),
    desc: 'Target marker for Dal Segno (D.S.) jumps',
    category: 'target',
  },
  {
    mark: 'coda',
    label: 'Coda Sign',
    symbol: 'Coda',
    symbolNode: (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5 text-slate-700 group-hover:text-blue-600"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d={MUSIC_GLYPHS.coda} />
      </svg>
    ),
    desc: 'Beginning of Coda ending section',
    category: 'target',
  },
  {
    mark: 'to-coda',
    label: 'To Coda',
    symbol: 'To Coda',
    symbolNode: (
      <span className="inline-flex items-center gap-1 font-serif italic font-bold text-slate-700 group-hover:text-blue-600 text-sm">
        <span>To Coda</span>
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 text-slate-700 group-hover:text-blue-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d={MUSIC_GLYPHS.coda} />
        </svg>
      </span>
    ),
    desc: 'Leap to Coda section during D.S. / D.C. pass',
    category: 'target',
  },
  {
    mark: 'fine',
    label: 'Fine',
    symbol: 'Fine',
    desc: 'End piece here after D.S. or D.C. jump pass',
    category: 'target',
  },

  // Dal Segno Navigation
  {
    mark: 'ds-al-coda',
    label: 'D.S. al Coda',
    symbol: 'D.S. al Coda',
    desc: 'Jump back to Segno, leap from To Coda to Coda',
    category: 'jump',
  },
  {
    mark: 'ds-al-fine',
    label: 'D.S. al Fine',
    symbol: 'D.S. al Fine',
    desc: 'Jump back to Segno and play to Fine',
    category: 'jump',
  },

  // Da Capo Navigation
  {
    mark: 'dc-al-coda',
    label: 'D.C. al Coda',
    symbol: 'D.C. al Coda',
    desc: 'Jump back to beginning, leap from To Coda to Coda',
    category: 'jump',
  },
  {
    mark: 'dc-al-fine',
    label: 'D.C. al Fine',
    symbol: 'D.C. al Fine',
    desc: 'Jump back to beginning and play to Fine',
    category: 'jump',
  },
];

export const FlowDialog: React.FC<FlowDialogProps> = ({
  isOpen,
  onClose,
  onInsertFlow,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print print:hidden"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      data-testid="flow-dialog"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Navigation className="w-5 h-5 text-blue-400" />
            <span>Musical Flow Navigation</span>
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

        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Section 1: Markers & Section Targets */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Section Markers & Targets
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {FLOW_OPTIONS.filter((o) => o.category === 'target').map((opt) => (
                <button
                  key={opt.mark}
                  type="button"
                  onClick={() => {
                    onInsertFlow(opt.mark);
                    onClose();
                  }}
                  className="p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-start gap-1 transition-all cursor-pointer group text-left"
                  data-testid={`flow-option-${opt.mark}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                      {opt.label}
                    </span>
                    <span className="font-serif italic font-bold text-slate-700 group-hover:text-blue-600 text-sm flex items-center">
                      {opt.symbolNode || opt.symbol}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Section 2: Jumps & Navigation Directives */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Navigation Jumps (D.S. & D.C.)
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {FLOW_OPTIONS.filter((o) => o.category === 'jump').map((opt) => (
                <button
                  key={opt.mark}
                  type="button"
                  onClick={() => {
                    onInsertFlow(opt.mark);
                    onClose();
                  }}
                  className="p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-start gap-1 transition-all cursor-pointer group text-left"
                  data-testid={`flow-option-${opt.mark}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                      {opt.label}
                    </span>
                    <span className="font-serif italic font-bold text-blue-600 text-xs flex items-center">
                      {opt.symbolNode || opt.symbol}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
