import React, { useState, useEffect } from 'react';
import { ScoreInfo } from '../../types/score';
import { X, Info } from 'lucide-react';

export interface ScoreInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  scoreInfo: ScoreInfo;
  onSave: (updated: ScoreInfo) => void;
}

export const ScoreInfoModal: React.FC<ScoreInfoModalProps> = ({ isOpen, onClose, scoreInfo, onSave }) => {
  const [formData, setFormData] = useState<ScoreInfo>(scoreInfo);

  useEffect(() => {
    setFormData(scoreInfo);
  }, [scoreInfo, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Info className="w-5 h-5 text-blue-400" />
            <span>Score Information</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-800 rounded" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Moonlight Sonata"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Subtitle</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. For Piano in C# Minor"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Composer</label>
              <input
                type="text"
                value={formData.composer}
                onChange={(e) => setFormData({ ...formData, composer: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Composer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Lyricist</label>
              <input
                type="text"
                value={formData.lyricist}
                onChange={(e) => setFormData({ ...formData, lyricist: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Lyricist"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Arranger</label>
              <input
                type="text"
                value={formData.arranger}
                onChange={(e) => setFormData({ ...formData, arranger: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Arranger"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tempo (BPM)</label>
              <input
                type="number"
                value={formData.tempo}
                onChange={(e) => setFormData({ ...formData, tempo: Number(e.target.value) || 120 })}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="30"
                max="300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Copyright Notice</label>
            <input
              type="text"
              value={formData.copyright}
              onChange={(e) => setFormData({ ...formData, copyright: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. © 2026 All Rights Reserved"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Measure Numbering</label>
            <select
              value={formData.measureNumbering || 'system-start'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  measureNumbering: e.target.value as any,
                })
              }
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="system-start">Start of each system</option>
              <option value="all-measures">All measures</option>
              <option value="interval-5">Every 5 measures</option>
              <option value="none">None (Hidden)</option>
            </select>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-2">Page & Print Layout</h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
                <input
                  type="checkbox"
                  data-testid="hide-empty-staves-checkbox"
                  checked={!!formData.hideEmptyStaves}
                  onChange={(e) =>
                    setFormData({ ...formData, hideEmptyStaves: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Hide Empty Staves on Resting Systems (Page/PDF View)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
                <input
                  type="checkbox"
                  data-testid="multi-measure-rests-checkbox"
                  checked={!!formData.multiMeasureRests}
                  onChange={(e) =>
                    setFormData({ ...formData, multiMeasureRests: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Consolidate Multi-Measure Rests</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
                <input
                  type="checkbox"
                  data-testid="auto-beaming-checkbox"
                  checked={formData.autoBeaming !== false}
                  onChange={(e) =>
                    setFormData({ ...formData, autoBeaming: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Automatic Metric Note Beaming (8th, 16th, 32nd Notes)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
                <input
                  type="checkbox"
                  data-testid="connect-staves-checkbox"
                  checked={formData.connectStaves !== false}
                  onChange={(e) =>
                    setFormData({ ...formData, connectStaves: e.target.checked })
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Connect & Beam Multi-Staff Barlines & Brackets in Page View</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm shadow-sm cursor-pointer"
            >
              Save Information
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
