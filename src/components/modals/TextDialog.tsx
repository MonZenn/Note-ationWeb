import React, { useState, useEffect, useRef } from 'react';
import { TextCategory, TextPlacement } from '../../types/score';
import { Type, X, Trash2 } from 'lucide-react';

export interface TextDialogProps {
  isOpen: boolean;
  initialCategory?: TextCategory;
  initialText?: string;
  initialPlacement?: TextPlacement;
  isEditing?: boolean;
  onSubmit: (data: { text: string; category: TextCategory; placement?: TextPlacement }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const CHORD_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', '♭', '♯'];
const CHORD_QUALITIES = ['m', '7', 'maj7', 'm7', 'dim', 'aug', 'sus4', '/'];
const PART_PRESETS = [
  'Intro',
  'Verse 1',
  'Verse 2',
  'Chorus',
  'Pre-Chorus',
  'Bridge',
  'Outro',
  '[ A ]',
  '[ B ]',
  '[ C ]',
];
const EXPRESSION_PRESETS = [
  'pizz.',
  'arco',
  'dolce',
  'espr.',
  'solo',
  'tutti',
  'rit.',
  'a tempo',
  'swing',
];

export const TextDialog: React.FC<TextDialogProps> = ({
  isOpen,
  initialCategory = 'chord',
  initialText = '',
  initialPlacement = 'above',
  isEditing = false,
  onSubmit,
  onDelete,
  onClose,
}) => {
  const [category, setCategory] = useState<TextCategory>(initialCategory);
  const [text, setText] = useState<string>(initialText);
  const [placement, setPlacement] = useState<TextPlacement>(initialPlacement);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setText(initialText);
      setPlacement(initialPlacement);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialCategory, initialText, initialPlacement]);

  if (!isOpen) return null;

  const handleChipClick = (chip: string) => {
    if (category === 'chord') {
      setText((prev) => prev + chip);
    } else if (category === 'part') {
      setText(chip);
    } else {
      setText((prev) => (prev ? `${prev} ${chip}` : chip));
    }
    inputRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit({
      category,
      text: trimmed,
      placement: category === 'note' ? placement : 'above',
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print print:hidden"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      data-testid="text-dialog"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Type className="w-5 h-5 text-blue-400" />
            <span>{isEditing ? 'Edit Text' : 'Insert Text'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-slate-800 rounded cursor-pointer text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-100 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCategory('chord');
              inputRef.current?.focus();
            }}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors cursor-pointer text-center ${
              category === 'chord'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Chord
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory('part');
              inputRef.current?.focus();
            }}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors cursor-pointer text-center ${
              category === 'part'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Part of Song
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory('note');
              inputRef.current?.focus();
            }}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors cursor-pointer text-center ${
              category === 'note'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Note on Piece
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Input field */}
          <div>
            <label
              htmlFor="text-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5"
            >
              Text
            </label>
            <input
              id="text-input"
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }
              }}
              placeholder={
                category === 'chord'
                  ? 'e.g. Cmaj7, G7/B, Am7'
                  : category === 'part'
                  ? 'e.g. Intro, Verse 1, Chorus'
                  : 'e.g. pizz., dolce, solo'
              }
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-base font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              autoFocus
            />
          </div>

          {/* Placement options for 'note' category */}
          {category === 'note' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Placement
              </label>
              <div className="flex items-center gap-5">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 font-medium">
                  <input
                    type="radio"
                    name="text-placement"
                    value="above"
                    checked={placement === 'above'}
                    onChange={() => setPlacement('above')}
                    className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Above Staff</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 font-medium">
                  <input
                    type="radio"
                    name="text-placement"
                    value="below"
                    checked={placement === 'below'}
                    onChange={() => setPlacement('below')}
                    className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Below Staff</span>
                </label>
              </div>
            </div>
          )}

          {/* Quick Preset Chips */}
          {category === 'chord' && (
            <div className="space-y-3">
              <div>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Roots & Accidentals
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CHORD_ROOTS.map((root) => (
                    <button
                      key={root}
                      type="button"
                      onClick={() => handleChipClick(root)}
                      className="px-3 py-1 text-sm font-semibold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-md border border-slate-200 transition-colors cursor-pointer"
                    >
                      {root}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Qualities & Extensions
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CHORD_QUALITIES.map((quality) => (
                    <button
                      key={quality}
                      type="button"
                      onClick={() => handleChipClick(quality)}
                      className="px-3 py-1 text-sm font-medium bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-md border border-slate-200 transition-colors cursor-pointer font-mono"
                    >
                      {quality}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {category === 'part' && (
            <div>
              <span className="block text-xs font-semibold text-slate-500 mb-1.5">
                Song Part Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PART_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleChipClick(preset)}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 rounded-md border border-blue-200 transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {category === 'note' && (
            <div>
              <span className="block text-xs font-semibold text-slate-500 mb-1.5">
                Expression Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {EXPRESSION_PRESETS.map((expr) => (
                  <button
                    key={expr}
                    type="button"
                    onClick={() => handleChipClick(expr)}
                    className="px-3 py-1.5 text-xs font-medium italic bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-md border border-slate-200 transition-colors cursor-pointer"
                  >
                    {expr}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 shrink-0 bg-slate-50">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!text.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditing ? 'Update' : 'Insert'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
