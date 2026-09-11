import React from 'react';
import { MusicElement, NoteArticulation, NoteOrnament, isOrnament } from '../../types/score';
import { MUSIC_GLYPHS } from '../../utils/musicGlyphs';
import { X, Sparkles } from 'lucide-react';

export interface ExpressionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activeElement?: MusicElement | null;
  onToggleExpression: (expression: NoteArticulation | NoteOrnament) => void;
}

interface ExpressionOption {
  id: NoteArticulation | NoteOrnament;
  label: string;
  category: 'articulation' | 'hold' | 'ornament';
  shortcut?: string;
  desc: string;
  icon: React.ReactNode;
}

const EXPRESSION_OPTIONS: ExpressionOption[] = [
  // 1. Articulations
  {
    id: 'staccato',
    label: 'Staccato',
    category: 'articulation',
    shortcut: ',',
    desc: 'Detached, crisp note (50% duration)',
    icon: (
      <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
        <circle cx="10" cy="10" r="3.5" />
      </svg>
    ),
  },
  {
    id: 'tenuto',
    label: 'Tenuto',
    category: 'articulation',
    shortcut: '_',
    desc: 'Held for full note length (100% duration)',
    icon: (
      <svg
        viewBox="0 0 20 20"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <line x1="3" y1="10" x2="17" y2="10" />
      </svg>
    ),
  },
  {
    id: 'accent',
    label: 'Accent',
    category: 'articulation',
    desc: 'Emphasized dynamic attack (+25% volume)',
    icon: (
      <svg
        viewBox="0 -6 16 12"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={MUSIC_GLYPHS.accent} />
      </svg>
    ),
  },
  {
    id: 'marcato',
    label: 'Marcato',
    category: 'articulation',
    desc: 'Sharp, forceful detachment (+30% vol, 70% dur)',
    icon: (
      <svg
        viewBox="0 -6 16 12"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={MUSIC_GLYPHS.marcato} />
      </svg>
    ),
  },
  {
    id: 'staccatissimo',
    label: 'Staccatissimo',
    category: 'articulation',
    desc: 'Very short, pointed wedge (25% duration)',
    icon: (
      <svg viewBox="2 -1 10 9" className="w-5 h-5" fill="currentColor">
        <path d={MUSIC_GLYPHS.staccatissimo} />
      </svg>
    ),
  },

  // 2. Holds & Pauses
  {
    id: 'fermata',
    label: 'Fermata',
    category: 'hold',
    desc: 'Sustain note or pause rest (200% duration)',
    icon: (
      <svg
        viewBox="0 -8 16 10"
        className="w-6 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d={MUSIC_GLYPHS.fermata} />
      </svg>
    ),
  },

  // 3. Ornaments
  {
    id: 'trill',
    label: 'Trill',
    category: 'ornament',
    desc: 'Rapid alternation with upper pitch (+2 semitones)',
    icon: (
      <svg
        viewBox="0 -8 15 12"
        className="w-6 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={MUSIC_GLYPHS.trill} />
      </svg>
    ),
  },
  {
    id: 'mordent',
    label: 'Mordent',
    category: 'ornament',
    desc: 'Rapid alternation with lower neighbor',
    icon: (
      <svg
        viewBox="0 -6 15 12"
        className="w-6 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={MUSIC_GLYPHS.mordent} />
      </svg>
    ),
  },
  {
    id: 'turn',
    label: 'Turn',
    category: 'ornament',
    desc: 'Melodic turn around principal pitch',
    icon: (
      <svg
        viewBox="0 -6 14 12"
        className="w-6 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={MUSIC_GLYPHS.turn} />
      </svg>
    ),
  },
];

function isExpressionActive(
  expr: NoteArticulation | NoteOrnament,
  activeElement?: MusicElement | null
): boolean {
  if (!activeElement) return false;

  if (activeElement.type === 'note') {
    if (expr === 'staccato') return Boolean(activeElement.staccato);
    if (expr === 'tenuto') return Boolean(activeElement.tenuto);
    if (expr === 'accent') return Boolean(activeElement.accent);
    if (expr === 'marcato') return Boolean(activeElement.marcato);
    if (expr === 'staccatissimo') return Boolean(activeElement.staccatissimo);
    if (expr === 'fermata') return Boolean(activeElement.fermata);
    if (isOrnament(expr)) {
      return activeElement.ornament === expr;
    }
  }

  if (activeElement.type === 'rest') {
    if (expr === 'fermata') return Boolean(activeElement.fermata);
  }

  return false;
}

export const ExpressionDialog: React.FC<ExpressionDialogProps> = ({
  isOpen,
  onClose,
  activeElement,
  onToggleExpression,
}) => {
  if (!isOpen) return null;

  const renderSection = (
    title: string,
    category: 'articulation' | 'hold' | 'ornament',
    subtitle?: string
  ) => {
    const options = EXPRESSION_OPTIONS.filter((o) => o.category === category);

    return (
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {title}
          </h3>
          {subtitle && (
            <span className="text-[11px] text-slate-400">{subtitle}</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {options.map((opt) => {
            const isActive = isExpressionActive(opt.id, activeElement);

            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={isActive}
                data-active={isActive ? 'true' : 'false'}
                data-testid={`expr-option-${opt.id}`}
                onClick={() => onToggleExpression(opt.id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer group text-left flex flex-col items-start gap-1 relative ${
                  isActive
                    ? 'border-blue-500 bg-blue-50/80 text-blue-900 shadow-sm ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold ${
                        isActive
                          ? 'text-blue-900'
                          : 'text-slate-800 group-hover:text-blue-600'
                      }`}
                    >
                      {opt.label}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <span
                    className={`flex items-center justify-center ${
                      isActive
                        ? 'text-blue-600'
                        : 'text-slate-700 group-hover:text-blue-600'
                    }`}
                  >
                    {opt.icon}
                  </span>
                </div>
                <div className="flex items-center justify-between w-full mt-0.5">
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {opt.desc}
                  </span>
                  {opt.shortcut && (
                    <kbd className="shrink-0 ml-1.5 px-1 py-0.5 text-[9px] font-mono bg-slate-100 text-slate-600 rounded border border-slate-200">
                      {opt.shortcut}
                    </kbd>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print print:hidden"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="expression-dialog"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span>Note Expressions & Ornaments</span>
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
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Section 1: Articulations */}
          {renderSection('Articulations', 'articulation')}

          <div className="h-px bg-slate-200" />

          {/* Section 2: Holds & Pauses */}
          {renderSection('Holds & Pauses', 'hold')}

          <div className="h-px bg-slate-200" />

          {/* Section 3: Melodic Ornaments */}
          {renderSection('Melodic Ornaments', 'ornament')}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            data-testid="btn-close-expression"
            className="px-5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
