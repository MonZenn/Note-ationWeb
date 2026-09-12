import React, { useState, useMemo } from 'react';
import { X, Keyboard, Search, Music, Sliders, Scissors, Compass, Play, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  desc: string;
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  // Note & Rest Entry
  { key: 'Enter', desc: 'Insert note at cursor pitch', category: 'Entry & Rhythms' },
  { key: 'Ctrl + Enter', desc: 'Add chord pitch to current note', category: 'Entry & Rhythms' },
  { key: 'Space', desc: 'Insert rest of active duration', category: 'Entry & Rhythms' },
  { key: '1 to 6', desc: 'Select duration (1=Whole, 2=Half, 3=Quarter, 4=8th, 5=16th, 6=32nd)', category: 'Entry & Rhythms' },
  { key: '.', desc: 'Cycle augmentation dot (None / Single / Double)', category: 'Entry & Rhythms' },
  { key: ';', desc: 'Toggle tie out on note', category: 'Entry & Rhythms' },
  { key: 'Tab', desc: 'Insert single bar line', category: 'Entry & Rhythms' },

  { key: 'Shift + 3', desc: 'Toggle triplet (3 in space of 2 notes) on selection or note', category: 'Entry & Rhythms' },

  // Pitches & Signatures
  { key: '↑ / ↓', desc: 'Shift cursor pitch up / down diatonically', category: 'Pitches & Clefs' },
  { key: 'C', desc: 'Open Clef insertion dialog (Treble, Bass, Alto, Tenor)', category: 'Pitches & Clefs' },
  { key: 'K', desc: 'Open Key Signature dialog (-7 flats to +7 sharps)', category: 'Pitches & Clefs' },
  { key: 'Shift + T', desc: 'Open Time Signature dialog (Common, Cut, Custom X/Y)', category: 'Pitches & Clefs' },
  { key: 'Alt + T', desc: 'Open Tempo & Metronome dialog', category: 'Pitches & Clefs' },
  { key: 'T', desc: 'Open Text / Performance note dialog', category: 'Pitches & Clefs' },
  { key: 'Ctrl + K', desc: 'Insert Chord symbol above staff', category: 'Pitches & Clefs' },
  { key: 'Ctrl + M', desc: 'Insert Song Part section badge', category: 'Pitches & Clefs' },

  // Expressions & Phrasing
  { key: 'X / Shift + E', desc: 'Open Unified Expressions & Ornaments picker', category: 'Expressions & Phrasing' },
  { key: ',', desc: 'Toggle staccato articulation dot on note or selection', category: 'Expressions & Phrasing' },
  { key: '_', desc: 'Toggle tenuto articulation line', category: 'Expressions & Phrasing' },
  { key: '/', desc: 'Toggle multi-note phrase slur on selection or note', category: 'Expressions & Phrasing' },
  { key: 'V / Shift + /', desc: 'Cycle slur curve direction (Auto / Above / Below)', category: 'Expressions & Phrasing' },
  { key: '< / Shift + ,', desc: 'Toggle crescendo hairpin on selected range', category: 'Expressions & Phrasing' },
  { key: '> / Shift + .', desc: 'Toggle decrescendo hairpin on selected range', category: 'Expressions & Phrasing' },
  { key: 'D / Shift + ↑/↓', desc: 'Cycle stem direction (Auto / Up / Down)', category: 'Expressions & Phrasing' },
  { key: 'B', desc: 'Toggle metric note beaming (Auto / Break / Join)', category: 'Expressions & Phrasing' },

  // Repeats & Structure
  { key: 'R', desc: 'Open Repeats & Ending (Voltas 1st/2nd) dialog', category: 'Repeats & Structure' },
  { key: 'F', desc: 'Open Flow navigation dialog (Segno, Coda, D.S., Fine)', category: 'Repeats & Structure' },
  { key: 'Ctrl + Shift + P', desc: 'Open Page Setup & Proportional Typography dialog', category: 'Repeats & Structure' },

  // Editing & Clipboard
  { key: 'Ctrl + C', desc: 'Copy selected elements (or element at cursor) to clipboard', category: 'Editing & Clipboard' },
  { key: 'Ctrl + X', desc: 'Cut selected elements to clipboard', category: 'Editing & Clipboard' },
  { key: 'Ctrl + V', desc: 'Paste clipboard elements into active staff at cursor', category: 'Editing & Clipboard' },
  { key: 'Ctrl + Z / Y', desc: 'Undo / Redo (50 levels of history)', category: 'Editing & Clipboard' },
  { key: 'Delete / Backspace', desc: 'Delete note/rest at cursor or all selected elements', category: 'Editing & Clipboard' },

  // Navigation & Playback
  { key: '← / →', desc: 'Move cursor to previous / next element', category: 'Navigation & Playback' },
  { key: 'Home / End', desc: 'Jump cursor to start / end of staff', category: 'Navigation & Playback' },
  { key: 'PageUp / PageDown', desc: 'Jump cursor to previous / next barline', category: 'Navigation & Playback' },
  { key: 'Ctrl + ↑ / ↓', desc: 'Switch active staff up / down', category: 'Navigation & Playback' },
  { key: 'F5 / Space', desc: 'Play score audio starting from active measure', category: 'Navigation & Playback' },
  { key: 'F6', desc: 'Stop audio playback', category: 'Navigation & Playback' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Shortcuts', icon: Keyboard },
  { id: 'Entry & Rhythms', label: 'Entry & Rhythms', icon: Music },
  { id: 'Pitches & Clefs', label: 'Pitches & Clefs', icon: Sliders },
  { id: 'Expressions & Phrasing', label: 'Expressions & Phrasing', icon: Sparkles },
  { id: 'Repeats & Structure', label: 'Repeats & Structure', icon: Compass },
  { id: 'Editing & Clipboard', label: 'Editing & Clipboard', icon: Scissors },
  { id: 'Navigation & Playback', label: 'Navigation & Playback', icon: Play },
];

export const ShortcutsCheatSheet: React.FC<Props> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredShortcuts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return SHORTCUTS.filter((s) => {
      const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
      const matchesSearch =
        !q || s.key.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  const groupedShortcuts = useMemo(() => {
    const map = new Map<string, ShortcutItem[]>();
    filteredShortcuts.forEach((item) => {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    });
    return map;
  }, [filteredShortcuts]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print print:hidden backdrop-blur-xs"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      data-testid="shortcuts-cheat-sheet-modal"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-400">Complete authoring, navigation, and editing shortcuts guide</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search and Filter Tabs */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts (e.g., chord, slur, stem)..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {groupedShortcuts.size === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Keyboard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No shortcuts matched &ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-3 text-xs text-blue-600 hover:underline font-semibold"
              >
                Clear search filters
              </button>
            </div>
          ) : (
            Array.from(groupedShortcuts.entries()).map(([catName, items]) => (
              <div key={catName} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {catName}
                  </h3>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[11px] text-slate-400 font-medium">
                    {items.length} {items.length === 1 ? 'shortcut' : 'shortcuts'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {items.map((s) => (
                    <div
                      key={s.key + s.desc}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                          {s.desc}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {s.key.split(' / ').map((keyPart, kIdx) => (
                          <React.Fragment key={keyPart}>
                            {kIdx > 0 && <span className="text-[10px] text-slate-400">or</span>}
                            <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded-md font-mono text-[11px] font-bold text-slate-800 shadow-2xs inline-block">
                              {keyPart}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            <span className="font-semibold text-slate-700">Tip:</span> Shortcuts are suppressed automatically while typing in modal dialogs or text fields.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors shadow-2xs ml-auto"
            data-testid="close-shortcuts-button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
