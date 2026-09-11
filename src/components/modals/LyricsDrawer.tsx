import React, { useState, useEffect } from 'react';
import { X, Mic } from 'lucide-react';
import { splitLyricsIntoSyllables } from '../../utils/lyricUtils';

const EMPTY_LYRICS: string[] = [];

export interface LyricsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialLyrics?: string[];
  lyricsText?: string;
  totalRhythmSlots?: number;
  onSave: (syllables: string[]) => void;
}

export const LyricsDrawer: React.FC<LyricsDrawerProps> = ({
  isOpen,
  onClose,
  initialLyrics = EMPTY_LYRICS,
  lyricsText,
  totalRhythmSlots,
  onSave,
}) => {
  const contentProp = lyricsText !== undefined ? lyricsText : initialLyrics.join(' ');
  const [text, setText] = useState(contentProp);

  useEffect(() => {
    if (isOpen) {
      setText(contentProp);
    }
  }, [isOpen, contentProp]);

  if (!isOpen) return null;

  const tokens = splitLyricsIntoSyllables(text);

  const handleApply = () => {
    onSave(tokens);
    onClose();
  };

  return (
    <div
      data-testid="lyrics-drawer"
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') onClose();
      }}
      className="fixed inset-y-0 right-0 z-50 w-96 bg-white shadow-2xl border-l border-slate-300 flex flex-col no-print print:hidden"
    >
      <div className="flex items-center justify-between p-4 bg-slate-900 text-white">
        <div className="flex items-center gap-2 font-bold">
          <Mic className="w-5 h-5 text-blue-400" />
          <span>Staff Lyrics Editor</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
        <p className="text-xs text-slate-500 mb-2 leading-relaxed">
          Use hyphens (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">Glo- ry</code>) to split syllables. Use an underscore (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">_</code>) to pass over a rest or unvoiced note without printing text.
        </p>
        {totalRhythmSlots !== undefined && (
          <div
            data-testid="lyrics-slot-counter"
            className={`text-xs px-2.5 py-1.5 rounded mb-3 flex items-center justify-between font-mono ${
              tokens.length === totalRhythmSlots
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>Slots aligned:</span>
            <span className="font-semibold">
              {tokens.length} / {totalRhythmSlots} rhythm slots
            </span>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 w-full p-3 border border-slate-300 rounded font-serif text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter lyrics here..."
          aria-label="Staff lyrics"
        />
      </div>

      <div className="p-4 border-t flex justify-end gap-2 bg-slate-50">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 shadow-sm cursor-pointer"
        >
          Apply Lyrics
        </button>
      </div>
    </div>
  );
};
