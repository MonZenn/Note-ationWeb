import React, { useState, useEffect, useRef } from 'react';
import { TempoBaseDuration, TempoDisplayMode } from '../../types/score';
import { Gauge, X, Trash2, Minus, Plus } from 'lucide-react';

export interface TempoDialogProps {
  isOpen: boolean;
  initialBpm?: number;
  initialBaseDuration?: TempoBaseDuration;
  initialDotted?: boolean;
  initialText?: string;
  initialDisplayMode?: TempoDisplayMode;
  isEditing?: boolean;
  onSubmit: (data: {
    bpm: number;
    baseDuration?: TempoBaseDuration;
    dotted?: boolean;
    text?: string;
    displayMode?: TempoDisplayMode;
  }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export const ITALIAN_TEMPO_PRESETS = [
  { label: 'Grave', bpm: 32 },
  { label: 'Largo', bpm: 50 },
  { label: 'Adagio', bpm: 72 },
  { label: 'Andante', bpm: 92 },
  { label: 'Moderato', bpm: 114 },
  { label: 'Allegretto', bpm: 126 },
  { label: 'Allegro', bpm: 138 },
  { label: 'Vivace', bpm: 160 },
  { label: 'Presto', bpm: 184 },
  { label: 'Prestissimo', bpm: 208 },
  { label: 'A tempo', bpm: 120 },
];

const BEAT_BASE_OPTIONS: { duration: TempoBaseDuration; dotted: boolean; label: string; symbol: string }[] = [
  { duration: 4, dotted: false, label: 'Quarter', symbol: '♩' },
  { duration: 4, dotted: true, label: 'Dotted Quarter', symbol: '♩.' },
  { duration: 8, dotted: false, label: 'Eighth', symbol: '♪' },
  { duration: 2, dotted: false, label: 'Half', symbol: '𝅗𝅥' },
];

const DISPLAY_MODE_OPTIONS: { mode: TempoDisplayMode; label: string }[] = [
  { mode: 'text-and-metronome', label: 'Both' },
  { mode: 'metronome-only', label: 'Metronome only' },
  { mode: 'text-only', label: 'Text only' },
];

export const TempoDialog: React.FC<TempoDialogProps> = ({
  isOpen,
  initialBpm = 120,
  initialBaseDuration = 4,
  initialDotted = false,
  initialText = '',
  initialDisplayMode = 'text-and-metronome',
  isEditing = false,
  onSubmit,
  onDelete,
  onClose,
}) => {
  const [bpm, setBpm] = useState<number>(initialBpm);
  const [bpmInput, setBpmInput] = useState<string>(String(initialBpm || 120));
  const [bpmError, setBpmError] = useState<string | null>(null);
  const [baseDuration, setBaseDuration] = useState<TempoBaseDuration>(initialBaseDuration);
  const [dotted, setDotted] = useState<boolean>(initialDotted);
  const [text, setText] = useState<string>(initialText);
  const [displayMode, setDisplayMode] = useState<TempoDisplayMode>(initialDisplayMode);

  const inputRef = useRef<HTMLInputElement>(null);
  const bpmInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const initBpm = initialBpm || 120;
      setBpm(initBpm);
      setBpmInput(String(initBpm));
      setBpmError(null);
      setBaseDuration(initialBaseDuration || 4);
      setDotted(Boolean(initialDotted));
      setText(initialText || '');
      setDisplayMode(initialDisplayMode || 'text-and-metronome');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialBpm, initialBaseDuration, initialDotted, initialText, initialDisplayMode]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBpmInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBpmInput(val);

    if (val.trim() === '') {
      setBpmError(null);
      return;
    }

    const parsed = Number(val);
    if (isNaN(parsed) || !Number.isInteger(parsed) || parsed < 20 || parsed > 400) {
      setBpmError('BPM must be an integer between 20 and 400');
    } else {
      setBpmError(null);
      setBpm(parsed);
    }
  };

  const handleStepBpm = (delta: number) => {
    const current = Number(bpmInput.trim());
    const base = isNaN(current) || current < 20 || current > 400 ? bpm : current;
    const next = Math.max(20, Math.min(400, base + delta));
    setBpm(next);
    setBpmInput(String(next));
    setBpmError(null);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setBpm(val);
    setBpmInput(String(val));
    setBpmError(null);
  };

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLabel = e.target.value;
    if (!selectedLabel) return;
    const preset = ITALIAN_TEMPO_PRESETS.find((p) => p.label === selectedLabel);
    if (preset) {
      setText(preset.label);
      setBpm(preset.bpm);
      setBpmInput(String(preset.bpm));
      setBpmError(null);
      if (displayMode === 'metronome-only') {
        setDisplayMode('text-and-metronome');
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = Number(bpmInput.trim());
    if (bpmInput.trim() === '' || isNaN(parsed) || !Number.isInteger(parsed) || parsed < 20 || parsed > 400) {
      setBpmError('BPM must be an integer between 20 and 400');
      bpmInputRef.current?.focus();
      return;
    }

    setBpmError(null);
    onSubmit({
      bpm: parsed,
      baseDuration,
      dotted,
      text: text.trim() || undefined,
      displayMode,
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete?.();
    onClose();
  };

  // Live preview string
  const currentBase = BEAT_BASE_OPTIONS.find(
    (b) => b.duration === baseDuration && b.dotted === dotted
  );
  const baseSymbol = currentBase ? currentBase.symbol : '♩';

  const parsedPreviewBpm = Number(bpmInput.trim());
  const isPreviewBpmValid =
    bpmInput.trim() !== '' && !isNaN(parsedPreviewBpm) && parsedPreviewBpm >= 20 && parsedPreviewBpm <= 400;
  const previewBpm = isPreviewBpmValid ? parsedPreviewBpm : bpmInput.trim() || '—';

  let previewText = '';
  if (displayMode === 'text-only') {
    previewText = text.trim() || 'Allegro';
  } else if (displayMode === 'metronome-only') {
    previewText = `${baseSymbol} = ${previewBpm}`;
  } else {
    previewText = `${text.trim() || 'Allegro'} (${baseSymbol} = ${previewBpm})`;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-[2px] select-none"
      onClick={onClose}
      data-testid="tempo-dialog-backdrop"
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        data-testid="tempo-dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 leading-none">
                {isEditing ? 'Edit Tempo & Metronome' : 'Insert Tempo Marking'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mid-score tempo specification and metronome marking
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="tempo-close-button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Live Engraving Preview Box */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-center">
            <span className="text-xs font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
              Score Preview
            </span>
            <div className="text-lg font-serif font-bold text-slate-900 flex items-center justify-center gap-1.5 min-h-[28px]">
              {previewText}
            </div>
          </div>

          {/* Italian Presets Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Italian Tempo Presets
            </label>
            <select
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              onChange={handlePresetSelect}
              defaultValue=""
              data-testid="tempo-preset-select"
            >
              <option value="" disabled>
                Select preset tempo...
              </option>
              {ITALIAN_TEMPO_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.label}>
                  {preset.label} ({preset.bpm} BPM)
                </option>
              ))}
            </select>
          </div>

          {/* Custom Text Marker Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tempo Description / Text (optional)
            </label>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Allegro, Andante, Meno mosso..."
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-serif"
              data-testid="tempo-text-input"
            />
          </div>

          {/* Beat Unit Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Beat Base Unit
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {BEAT_BASE_OPTIONS.map((opt) => {
                const isSelected = baseDuration === opt.duration && dotted === opt.dotted;
                return (
                  <button
                    key={`${opt.duration}-${opt.dotted}`}
                    type="button"
                    onClick={() => {
                      setBaseDuration(opt.duration);
                      setDotted(opt.dotted);
                    }}
                    className={`px-2 py-2 rounded-lg border text-sm font-semibold flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    data-testid={`beat-base-${opt.duration}${opt.dotted ? '-dotted' : ''}`}
                  >
                    <span className="text-base leading-none">{opt.symbol}</span>
                    <span className="text-[10px] opacity-80">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tempo BPM Stepper and Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600">
                Beats Per Minute (BPM: 20 – 400)
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStepBpm(-1)}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  title="Decrease 1 BPM"
                  data-testid="tempo-bpm-minus"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={bpmInputRef}
                  type="number"
                  value={bpmInput}
                  onChange={handleBpmInputChange}
                  className={`w-16 px-1.5 py-0.5 border rounded text-center text-sm font-bold transition-colors ${
                    bpmError
                      ? 'border-rose-400 bg-rose-50/30 text-rose-700 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500'
                  }`}
                  data-testid="tempo-bpm-input"
                />
                <button
                  type="button"
                  onClick={() => handleStepBpm(1)}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  title="Increase 1 BPM"
                  data-testid="tempo-bpm-plus"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {bpmError && (
              <p className="text-xs text-rose-600 font-medium mb-1.5 text-right animate-in fade-in duration-100" data-testid="tempo-bpm-error">
                {bpmError}
              </p>
            )}
            <input
              type="range"
              min={20}
              max={400}
              value={bpm}
              onChange={handleSliderChange}
              className="w-full accent-blue-600 cursor-pointer"
              data-testid="tempo-bpm-slider"
            />
          </div>

          {/* Display Mode Radio / Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Display Format
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {DISPLAY_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => setDisplayMode(opt.mode)}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer text-center ${
                    displayMode === opt.mode
                      ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  data-testid={`display-mode-${opt.mode}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 shrink-0 bg-slate-50">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                data-testid="tempo-delete-button"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                data-testid="tempo-cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                data-testid="tempo-submit-button"
              >
                {isEditing ? 'Update Tempo' : 'Insert Tempo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
