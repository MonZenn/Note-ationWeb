import React, { useState } from 'react';
import { Staff, InstrumentType, ClefType } from '../../types/score';
import { X, Layers, Plus, Trash2, Volume2, VolumeX, Radio, ChevronUp, ChevronDown, Link2 } from 'lucide-react';

export const INSTRUMENT_OPTIONS: { value: InstrumentType; label: string }[] = [
  { value: 'piano', label: 'Piano' },
  { value: 'grand-piano', label: 'Grand Piano' },
  { value: 'violin', label: 'Violin' },
  { value: 'viola', label: 'Viola' },
  { value: 'cello', label: 'Cello' },
  { value: 'flute', label: 'Flute' },
  { value: 'piccolo', label: 'Piccolo' },
  { value: 'trumpet', label: 'Trumpet' },
  { value: 'tuba', label: 'Tuba' },
  { value: 'bagpipe', label: 'Bagpipe' },
  { value: 'harp', label: 'Harp' },
  { value: 'pipe-organ', label: 'Pipe Organ' },
];

export interface StaffManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  staves: Staff[];
  activeStaffIndex?: number;
  onSelectStaff?: (index: number) => void;
  onAddStaff: (name: string, clef: ClefType, instrument?: InstrumentType) => void;
  onAddSubstaff?: (parentStaffId: string) => void;
  onRemoveStaff: (index: number) => void;
  onUpdateStaff: (index: number, updates: Partial<Staff>) => void;
  onReorderStaves?: (fromIndex: number, toIndex: number) => void;
}

export const StaffManagerModal: React.FC<StaffManagerModalProps> = ({
  isOpen,
  onClose,
  staves,
  activeStaffIndex = 0,
  onSelectStaff,
  onAddStaff,
  onAddSubstaff,
  onRemoveStaff,
  onUpdateStaff,
  onReorderStaves,
}) => {
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffClef, setNewStaffClef] = useState<ClefType>('treble');
  const [newStaffInstrument, setNewStaffInstrument] = useState<InstrumentType>('piano');

  if (!isOpen) return null;

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newStaffName.trim() || `Staff ${staves.length + 1}`;
    onAddStaff(name, newStaffClef, newStaffInstrument);
    setNewStaffName('');
    setNewStaffInstrument('piano');
  };

  const handleToggleSolo = (index: number) => {
    // A staff is considered "soloed" if it is unmuted and ALL other staves are muted.
    const isCurrentlySoloed =
      !staves[index].muted &&
      staves.length > 1 &&
      staves.every((s, i) => (i === index ? !s.muted : s.muted));

    if (isCurrentlySoloed) {
      // Unmute all staves
      staves.forEach((_, i) => onUpdateStaff(i, { muted: false }));
    } else {
      // Mute all staves except this one
      staves.forEach((_, i) => onUpdateStaff(i, { muted: i !== index }));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print print:hidden backdrop-blur-xs"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      data-testid="staff-manager-modal"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5 font-bold text-lg">
            <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="leading-tight block">Manage Score Staves</span>
              <span className="text-xs font-normal text-slate-400">Configure staves, instruments, voice layers, and playback</span>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Staves List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Score Staves ({staves.length})
              </h3>
              <span className="text-xs text-slate-400">Rename staves, position with up/down arrows, and link with "Beam to Next"</span>
            </div>

            <div className="space-y-2.5">
              {staves.map((staff, idx) => {
                const isActive = idx === activeStaffIndex;
                const isSoloed =
                  !staff.muted &&
                  staves.length > 1 &&
                  staves.every((s, i) => (i === idx ? !s.muted : s.muted));

                const hasSubstaff = staves.some((s) => s.substaffOf === staff.id);

                return (
                  <div
                    key={staff.id || idx}
                    className={`p-3.5 rounded-xl border transition-all ${
                      staff.substaffOf ? 'ml-6 pl-8 border-indigo-200 bg-indigo-50/30 ' : 'border-slate-200 bg-white '
                    }${
                      isActive
                        ? 'ring-2 ring-blue-500 border-blue-400 shadow-sm bg-blue-50/40'
                        : 'hover:border-slate-300 hover:shadow-xs'
                    }`}
                    data-testid={`staff-row-${idx}`}
                  >
                    {/* Top Row: Identity, Editable Name & Badges & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      {/* Left: Active radio, Editable Name & Badges */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => onSelectStaff?.(idx)}
                          className={`p-1 rounded-md cursor-pointer transition-colors ${
                            isActive ? 'text-blue-600 bg-blue-100/70' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                          title={isActive ? 'Active Staff' : 'Set as Active Staff'}
                          data-testid={`select-staff-${idx}`}
                        >
                          <Radio className={`w-4 h-4 ${isActive ? 'fill-blue-600' : ''}`} />
                        </button>

                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          {/* Live Editable Staff Name Input */}
                          <input
                            type="text"
                            value={staff.name}
                            onChange={(e) => onUpdateStaff(idx, { name: e.target.value })}
                            className="font-bold text-sm text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44 shadow-2xs transition-colors"
                            placeholder="Staff name"
                            title="Edit staff name"
                            data-testid={`staff-name-input-${idx}`}
                          />
                          <select
                            value={staff.initialClef}
                            onChange={(e) => onUpdateStaff(idx, { initialClef: e.target.value as ClefType })}
                            className="text-xs px-2 py-1 rounded-lg bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer transition-colors"
                            title="Change initial clef"
                            data-testid={`staff-clef-select-${idx}`}
                          >
                            <option value="treble">𝄞 Treble</option>
                            <option value="bass">𝄢 Bass</option>
                            <option value="alto">𝄡 Alto</option>
                            <option value="tenor">𝄡 Tenor</option>
                          </select>
                          {staff.substaffOf && (
                            <span className="text-[11px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-semibold border border-indigo-200">
                              Voice 2 Substaff
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-xs">
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Reorder Up/Down, Beam With Next, + Substaff & Remove */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Move Up Button */}
                        {onReorderStaves && (
                          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => onReorderStaves(idx, idx - 1)}
                              disabled={idx === 0}
                              className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              title="Move Staff Up"
                              data-testid={`move-staff-up-${idx}`}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onReorderStaves(idx, idx + 1)}
                              disabled={idx === staves.length - 1}
                              className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              title="Move Staff Down"
                              data-testid={`move-staff-down-${idx}`}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Beam with Next Staff Toggle */}
                        {idx < staves.length - 1 && !staff.substaffOf && !staves[idx + 1].substaffOf && (() => {
                          const isBeamed = staff.beamWithNext ?? true;
                          return (
                            <button
                              type="button"
                              onClick={() => onUpdateStaff(idx, { beamWithNext: !isBeamed })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border shadow-2xs ${
                                isBeamed
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                              title={isBeamed ? 'Staff is beamed/connected to the staff below' : 'Click to beam with the next staff below'}
                              data-testid={`beam-staff-toggle-${idx}`}
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              <span>{isBeamed ? 'Beamed to Next' : 'Beam to Next'}</span>
                            </button>
                          );
                        })()}

                        {!staff.substaffOf && !hasSubstaff && (
                          <button
                            type="button"
                            onClick={() => onAddSubstaff?.(staff.id)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                            title="Add Voice 2 Substaff"
                            data-testid={`add-substaff-button-${idx}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Substaff</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onRemoveStaff(idx)}
                          disabled={staves.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          title={staves.length <= 1 ? 'Cannot remove the only staff' : 'Remove Staff'}
                          data-testid={`remove-staff-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Instrument Selection & Audio Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5">
                      {/* Instrument Selector */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                          Instrument:
                        </label>
                        <select
                          value={staff.instrument || 'piano'}
                          onChange={(e) =>
                            onUpdateStaff(idx, { instrument: e.target.value as InstrumentType })
                          }
                          className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
                          title="Staff Instrument"
                          data-testid={`staff-instrument-select-${idx}`}
                        >
                          {INSTRUMENT_OPTIONS.map((inst) => (
                            <option key={inst.value} value={inst.value}>
                              {inst.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Audio Mixer Controls: Mute, Solo, Volume */}
                      <div className="flex items-center gap-2.5">
                        {/* Mute Toggle */}
                        <button
                          type="button"
                          onClick={() => onUpdateStaff(idx, { muted: !staff.muted })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border cursor-pointer transition-colors ${
                            staff.muted
                              ? 'bg-rose-100 border-rose-300 text-rose-700 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                          title={staff.muted ? 'Unmute Staff' : 'Mute Staff'}
                          data-testid={`mute-staff-${idx}`}
                        >
                          {staff.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span>{staff.muted ? 'Muted' : 'Mute'}</span>
                        </button>

                        {/* Solo Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleSolo(idx)}
                          disabled={staves.length <= 1}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            isSoloed
                              ? 'bg-amber-500 border-amber-600 text-white font-bold shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                          title="Solo Staff"
                          data-testid={`solo-staff-${idx}`}
                        >
                          Solo
                        </button>

                        {/* Volume Slider & Percent Readout */}
                        <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={staff.muted ? 0 : staff.volume ?? 1}
                            onChange={(e) =>
                              onUpdateStaff(idx, { volume: parseFloat(e.target.value), muted: false })
                            }
                            className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            title={`Volume: ${Math.round((staff.volume ?? 1) * 100)}%`}
                            data-testid={`volume-slider-${idx}`}
                          />
                          <span className="text-[11px] font-mono text-slate-500 w-8 text-right">
                            {staff.muted ? '0%' : `${Math.round((staff.volume ?? 1) * 100)}%`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Staff Form */}
          <form
            onSubmit={handleAddStaff}
            className="p-4.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5"
            data-testid="add-staff-form"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Add New Staff</span>
              </h4>
              <span className="text-xs text-slate-400">Add an independent melodic or accompaniment staff</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Staff Name
                </label>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder={`Staff ${staves.length + 1}`}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  data-testid="new-staff-name-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Initial Clef
                </label>
                <select
                  value={newStaffClef}
                  onChange={(e) => setNewStaffClef(e.target.value as ClefType)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  data-testid="new-staff-clef-select"
                >
                  <option value="treble">𝄞 Treble Clef</option>
                  <option value="bass">𝄢 Bass Clef</option>
                  <option value="alto">𝄡 Alto Clef</option>
                  <option value="tenor">𝄡 Tenor Clef</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Instrument
                </label>
                <select
                  value={newStaffInstrument}
                  onChange={(e) => setNewStaffInstrument(e.target.value as InstrumentType)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  data-testid="new-staff-instrument-select"
                >
                  {INSTRUMENT_OPTIONS.map((inst) => (
                    <option key={inst.value} value={inst.value}>
                      {inst.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-colors"
                data-testid="add-staff-button"
              >
                <Plus className="w-4 h-4" />
                <span>Add Staff</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors shadow-2xs"
            data-testid="close-staff-manager-button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
