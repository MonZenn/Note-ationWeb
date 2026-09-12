import React from 'react';
import { Play, Square, Info, Download, Upload, HelpCircle, LayoutGrid, FileText, Mic, Layers, Scissors, Copy, ClipboardPaste, SlidersHorizontal } from 'lucide-react';
import { ScoreInfo } from '../../types/score';

interface Props {
  scoreInfo: ScoreInfo;
  isPlaying: boolean;
  viewMode: 'ribbon' | 'page';
  onTogglePlay: () => void;
  onOpenInfo: () => void;
  onOpenShortcuts: () => void;
  onSaveFile: () => void;
  onOpenFile: () => void;
  onToggleViewMode: (mode: 'ribbon' | 'page') => void;
  onOpenLyrics?: () => void;
  onOpenStaffManager?: () => void;
  onOpenPageSetup?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  canPaste?: boolean;
}

export const HeaderBar: React.FC<Props> = ({
  scoreInfo,
  isPlaying,
  viewMode,
  onTogglePlay,
  onOpenInfo,
  onOpenShortcuts,
  onSaveFile,
  onOpenFile,
  onToggleViewMode,
  onOpenLyrics,
  onOpenStaffManager,
  onOpenPageSetup,
  onCopy,
  onCut,
  onPaste,
  canPaste,
}) => {
  return (
    <header className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between border-b border-slate-800 select-none no-print print:hidden">
      <div className="flex items-center gap-4">
        <span className="font-black text-lg text-blue-400 tracking-wide">Note-ation</span>
        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
          {scoreInfo.title || 'Untitled'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Playback */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors ${
            isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlaying ? 'Stop (F6)' : 'Play (F5)'}</span>
        </button>

        {/* View Mode Switcher */}
        <div className="flex bg-slate-800 rounded p-0.5 text-xs font-semibold">
          <button
            onClick={() => onToggleViewMode('ribbon')}
            className={`px-3 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors ${viewMode === 'ribbon' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <LayoutGrid className="w-3 h-3" /> Ribbon
          </button>
          <button
            onClick={() => onToggleViewMode('page')}
            className={`px-3 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors ${viewMode === 'page' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <FileText className="w-3 h-3" /> Page View
          </button>
        </div>

        {/* Page Setup Button */}
        {onOpenPageSetup && (
          <button
            onClick={onOpenPageSetup}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
            title="Page Setup & Typography (Ctrl+Shift+P)"
            data-testid="page-setup-button"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>Page Setup</span>
          </button>
        )}

        {/* Manage Staves Button */}
        {onOpenStaffManager && (
          <button
            onClick={onOpenStaffManager}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
            title="Manage Staves"
            data-testid="manage-staves-button"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Manage Staves</span>
          </button>
        )}

        {/* Score Info Button */}
        <button
          onClick={onOpenInfo}
          className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
        >
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>Score Info</span>
        </button>

        {/* Lyrics Drawer Button */}
        {onOpenLyrics && (
          <button
            onClick={onOpenLyrics}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
            title="Edit Lyrics"
          >
            <Mic className="w-3.5 h-3.5 text-blue-400" />
            <span>Lyrics</span>
          </button>
        )}

        {/* Clipboard Actions */}
        {(onCut || onCopy || onPaste) && (
          <div className="flex bg-slate-800 rounded p-0.5 text-xs font-semibold items-center" data-testid="header-clipboard-group">
            {onCut && (
              <button
                type="button"
                onClick={onCut}
                className="px-2 py-1 rounded flex items-center gap-1 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                title="Cut (Ctrl+X)"
                data-testid="header-cut-button"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Cut</span>
              </button>
            )}
            {onCopy && (
              <button
                type="button"
                onClick={onCopy}
                className="px-2 py-1 rounded flex items-center gap-1 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                title="Copy (Ctrl+C)"
                data-testid="header-copy-button"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Copy</span>
              </button>
            )}
            {onPaste && (
              <button
                type="button"
                onClick={onPaste}
                disabled={canPaste === false}
                className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                  canPaste === false
                    ? 'text-slate-500 cursor-not-allowed'
                    : 'hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer'
                }`}
                title="Paste (Ctrl+V)"
                data-testid="header-paste-button"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Paste</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenFile}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer transition-colors"
          title="Open .noteweb file"
        >
          <Upload className="w-4 h-4" />
        </button>
        <button
          onClick={onSaveFile}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer transition-colors"
          title="Save .noteweb file"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer transition-colors"
          title="Keyboard Shortcuts (?)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
