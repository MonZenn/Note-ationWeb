import React, { useState, useEffect } from 'react';
import { X, Mic, Plus, Trash2, Copy } from 'lucide-react';
import { splitLyricsIntoSyllables, compileLyricPartsToVerses } from '../../utils/lyricUtils';
import { LyricPart } from '../../types/score';

const EMPTY_LYRICS: string[] = [];

export const PART_PRESETS = [
  'Verse',
  'Chorus',
  'Bridge',
  'Intro',
  'Outro',
  'Pre-Chorus',
  'Coda',
  'Custom',
] as const;

export const TOOLBAR_PRESETS = [
  'Verse',
  'Chorus',
  'Bridge',
  'Intro',
  'Outro',
  'Custom',
] as const;

export type LyricsMode = 'continuous' | 'arranger';

export interface LyricsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialLyrics?: string[];
  initialVerses?: string[][];
  initialLyricParts?: LyricPart[];
  lyricsText?: string;
  totalRhythmSlots?: number;
  onSave: (syllables: string[]) => void;
  onSaveVerses?: (verses: string[][]) => void;
  onSaveLyricParts?: (parts: LyricPart[]) => void;
}

export const LyricsDrawer: React.FC<LyricsDrawerProps> = ({
  isOpen,
  onClose,
  initialLyrics = EMPTY_LYRICS,
  initialVerses,
  initialLyricParts,
  lyricsText,
  totalRhythmSlots,
  onSave,
  onSaveVerses,
  onSaveLyricParts,
}) => {
  const computeInitialVerses = (): string[] => {
    if (initialVerses && initialVerses.length > 0) {
      return initialVerses.map((v) => v.join(' '));
    }
    if (lyricsText !== undefined) {
      return [lyricsText];
    }
    return [initialLyrics.join(' ')];
  };

  const computeInitialParts = (): LyricPart[] => {
    if (initialLyricParts && initialLyricParts.length > 0) {
      return initialLyricParts.map((p) => ({
        ...p,
        layers: [...(p.layers || [])],
      }));
    }
    return [];
  };

  const computeInitialMode = (): LyricsMode => {
    return initialLyricParts && initialLyricParts.length > 0 ? 'arranger' : 'continuous';
  };

  const [mode, setMode] = useState<LyricsMode>(computeInitialMode);
  const [verses, setVerses] = useState<string[]>(computeInitialVerses);
  const [parts, setParts] = useState<LyricPart[]>(computeInitialParts);
  const [activeLayerIndex, setActiveLayerIndex] = useState<number>(0);
  const [layerCount, setLayerCount] = useState<number>(() => {
    const initVerses = computeInitialVerses();
    const initParts = computeInitialParts();
    return Math.max(1, initVerses.length, ...initParts.map((p) => p.layers?.length || 0));
  });

  useEffect(() => {
    if (isOpen) {
      const initV = computeInitialVerses();
      const initP = computeInitialParts();
      setVerses(initV);
      setParts(initP);
      setMode(initialLyricParts && initialLyricParts.length > 0 ? 'arranger' : 'continuous');
      setActiveLayerIndex(0);
      setLayerCount(Math.max(1, initV.length, ...initP.map((p) => p.layers?.length || 0)));
    }
  }, [isOpen, lyricsText, initialLyrics, initialVerses, initialLyricParts]);

  if (!isOpen) return null;

  const currentVerseText = verses[activeLayerIndex] || '';
  const currentTokens =
    mode === 'arranger'
      ? compileLyricPartsToVerses(parts)[activeLayerIndex] || []
      : splitLyricsIntoSyllables(currentVerseText);

  const handleContinuousTextChange = (val: string) => {
    setVerses((prev) => {
      const next = [...prev];
      next[activeLayerIndex] = val;
      return next;
    });
  };

  const handleAddLayer = () => {
    const nextIdx = layerCount;
    setLayerCount((prev) => prev + 1);
    setVerses((prev) => {
      const next = [...prev];
      while (next.length <= nextIdx) next.push('');
      return next;
    });
    setParts((prev) =>
      prev.map((p) => {
        const layers = [...(p.layers || [])];
        while (layers.length <= nextIdx) layers.push('');
        return { ...p, layers };
      })
    );
    setActiveLayerIndex(nextIdx);
  };

  const handleDeleteLayer = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (layerCount <= 1) return;
    setLayerCount((prev) => Math.max(1, prev - 1));
    setVerses((prev) => prev.filter((_, i) => i !== idx));
    setParts((prev) =>
      prev.map((p) => ({
        ...p,
        layers: (p.layers || []).filter((_, i) => i !== idx),
      }))
    );
    if (activeLayerIndex >= idx) {
      setActiveLayerIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const handleDuplicatePattern = () => {
    if (verses.length === 0) return;
    const v1Tokens = splitLyricsIntoSyllables(verses[0] || '');
    if (v1Tokens.length === 0) return;

    const activeTokens = splitLyricsIntoSyllables(currentVerseText);
    const nonUnderscores = activeTokens.filter((t) => t !== '_');

    let voicedIdx = 0;
    const resultTokens: string[] = [];

    for (let i = 0; i < v1Tokens.length; i++) {
      if (v1Tokens[i] === '_') {
        resultTokens.push('_');
      } else {
        if (voicedIdx < nonUnderscores.length) {
          resultTokens.push(nonUnderscores[voicedIdx]);
          voicedIdx++;
        }
      }
    }

    // Append any extra voiced tokens if active verse had more words than v1
    while (voicedIdx < nonUnderscores.length) {
      resultTokens.push(nonUnderscores[voicedIdx]);
      voicedIdx++;
    }

    const newText = resultTokens.join(' ').replace(/\s+/g, ' ').trim();
    handleContinuousTextChange(newText);
  };

  const handleAddPart = (presetName: string) => {
    const newPart: LyricPart = {
      id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: presetName,
      layers: Array.from({ length: layerCount }, () => ''),
    };
    setParts((prev) => [...prev, newPart]);
  };

  const handlePartNameChange = (idx: number, name: string) => {
    setParts((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], name };
      return next;
    });
  };

  const handlePartTextChange = (partIdx: number, layerIdx: number, val: string) => {
    setParts((prev) => {
      const next = [...prev];
      const targetPart = { ...next[partIdx] };
      const layers = [...(targetPart.layers || [])];
      while (layers.length <= layerIdx) {
        layers.push('');
      }
      layers[layerIdx] = val;
      targetPart.layers = layers;
      next[partIdx] = targetPart;
      return next;
    });
  };

  const handleMovePart = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= parts.length) return;
    setParts((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleDeletePart = (idx: number) => {
    setParts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleApply = () => {
    if (mode === 'arranger') {
      const compiled = compileLyricPartsToVerses(parts);
      if (onSaveLyricParts) {
        onSaveLyricParts(parts);
      }
      if (onSaveVerses) {
        onSaveVerses(compiled);
      }
      onSave(compiled[0] || []);
    } else {
      const allVersesTokens = verses.map((v) => splitLyricsIntoSyllables(v));
      if (onSaveVerses) {
        onSaveVerses(allVersesTokens);
      }
      onSave(allVersesTokens[0] || []);
    }
    onClose();
  };

  return (
    <div
      data-testid="lyrics-drawer"
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') onClose();
      }}
      className="fixed inset-y-0 right-0 z-50 w-[420px] max-w-[95vw] bg-white shadow-2xl border-l border-slate-300 flex flex-col no-print print:hidden"
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

      {/* Mode Toggle: Segmented control */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-200 bg-slate-50">
        <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-medium">
          <button
            type="button"
            data-testid="mode-continuous-btn"
            onClick={() => setMode('continuous')}
            className={`flex-1 py-1.5 rounded-md text-center cursor-pointer transition-all ${
              mode === 'continuous'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Continuous
          </button>
          <button
            type="button"
            data-testid="mode-arranger-btn"
            onClick={() => setMode('arranger')}
            className={`flex-1 py-1.5 rounded-md text-center cursor-pointer transition-all ${
              mode === 'arranger'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Part Arranger
          </button>
        </div>
      </div>

      {/* Layer Tabs */}
      <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-2 border-b border-slate-200 bg-slate-50 overflow-x-auto">
        {Array.from({ length: layerCount }).map((_, idx) => {
          const isActive = idx === activeLayerIndex;
          const canDelete = layerCount > 1 && !isActive;
          return (
            <div
              key={`layer-tab-wrap-${idx}`}
              className={`flex items-center rounded text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <button
                type="button"
                data-testid={`layer-tab-${idx}`}
                onClick={() => setActiveLayerIndex(idx)}
                className="px-2.5 py-1 cursor-pointer focus:outline-none"
              >
                <span data-testid={`verse-tab-${idx}`}>Layer {idx + 1}</span>
              </button>
              {canDelete && (
                <button
                  type="button"
                  data-testid={`delete-layer-btn-${idx}`}
                  onClick={(e) => handleDeleteLayer(e, idx)}
                  aria-label={`Delete Layer ${idx + 1}`}
                  className="pr-1.5 pl-0.5 py-1 text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  <span data-testid={`delete-verse-btn-${idx}`}>
                    <Trash2 className="w-3 h-3" />
                  </span>
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          data-testid="add-layer-btn"
          onClick={handleAddLayer}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 cursor-pointer"
        >
          <span data-testid="add-verse-btn" className="flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Layer</span>
          </span>
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
              currentTokens.length === totalRhythmSlots
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>Slots aligned:</span>
            <span className="font-semibold">
              {currentTokens.length} / {totalRhythmSlots} note slots
            </span>
          </div>
        )}

        {mode === 'continuous' ? (
          <>
            {/* Quick Action: Duplicate Rhythm Pattern from Verse 1 */}
            {activeLayerIndex > 0 && (
              <div className="mb-2">
                <button
                  type="button"
                  data-testid="duplicate-pattern-btn"
                  onClick={handleDuplicatePattern}
                  className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate rhythm pattern from Verse 1</span>
                </button>
              </div>
            )}

            <textarea
              value={currentVerseText}
              onChange={(e) => handleContinuousTextChange(e.target.value)}
              className="flex-1 w-full p-3 border border-slate-300 rounded font-serif text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter lyrics here..."
              aria-label="Staff lyrics"
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Quick-add Toolbar */}
            <div className="mb-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Add Song Part
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TOOLBAR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    data-testid={`add-part-${preset.toLowerCase()}-btn`}
                    onClick={() => handleAddPart(preset)}
                    className="px-2.5 py-1 text-xs font-medium rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Part Cards List */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {parts.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs">
                  No song parts added yet. Click a button above to add your first part.
                </div>
              ) : (
                parts.map((part, idx) => {
                  const layerText = part.layers?.[activeLayerIndex] || '';
                  const isBlank = !layerText.trim();
                  const showFallbackHint = activeLayerIndex > 0 && isBlank;

                  return (
                    <div
                      key={part.id}
                      data-testid={`part-card-${idx}`}
                      className="border border-slate-200 rounded-lg p-3 bg-white shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <select
                          value={part.name}
                          onChange={(e) => handlePartNameChange(idx, e.target.value)}
                          className="text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          aria-label={`Part type for ${part.name}`}
                        >
                          {PART_PRESETS.map((preset) => (
                            <option key={preset} value={preset}>
                              {preset}
                            </option>
                          ))}
                          {!(PART_PRESETS as readonly string[]).includes(part.name) && (
                            <option value={part.name}>{part.name}</option>
                          )}
                        </select>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMovePart(idx, idx - 1)}
                            title="Move part up"
                            aria-label="Move part up"
                            data-testid={`move-up-part-${idx}`}
                            className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                              idx === 0
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                            }`}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === parts.length - 1}
                            onClick={() => handleMovePart(idx, idx + 1)}
                            title="Move part down"
                            aria-label="Move part down"
                            data-testid={`move-down-part-${idx}`}
                            className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                              idx === parts.length - 1
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                            }`}
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePart(idx)}
                            title="Delete part"
                            aria-label="Delete part"
                            data-testid={`delete-part-${idx}`}
                            className="px-1.5 py-0.5 rounded text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {showFallbackHint && (
                        <div
                          data-testid={`part-fallback-hint-${idx}`}
                          className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 mb-2 flex items-center gap-1.5"
                        >
                          <span>💡</span>
                          <span>Inherits Layer 1 (Shared single line on score)</span>
                        </div>
                      )}

                      <textarea
                        value={layerText}
                        onChange={(e) => handlePartTextChange(idx, activeLayerIndex, e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded font-serif text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                        placeholder={`Enter lyrics for ${part.name}...`}
                        aria-label={`${part.name} Layer ${activeLayerIndex + 1} lyrics`}
                        data-testid={`part-textarea-${idx}`}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
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
