import React, { useState, useEffect } from 'react';
import {
  ScoreInfo,
  PageSetupConfig,
  ScoreFontsConfig,
  ScoreFontCategory,
  FontSetting,
} from '../../types/score';
import {
  DEFAULT_PAGE_SETUP,
  DEFAULT_SCORE_FONTS,
  resolvePageSetup,
  resolveScoreFonts,
} from '../../engine/layout/geometry';
import { X, Sliders, Type, RotateCcw, Check } from 'lucide-react';

export interface PageSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  scoreInfo: ScoreInfo;
  onSave: (pageSetup: PageSetupConfig, fonts: ScoreFontsConfig) => void;
}

export const FONT_CATEGORIES: { key: ScoreFontCategory; label: string; sample: string }[] = [
  { key: 'title', label: 'Title', sample: 'Symphony No. 5 in C Minor' },
  { key: 'subtitle', label: 'Subtitle', sample: 'Op. 67 — Movement I: Allegro con brio' },
  { key: 'composer', label: 'Composer', sample: 'Ludwig van Beethoven' },
  { key: 'lyricist', label: 'Lyricist', sample: 'Friedrich Schiller' },
  { key: 'staffLyrics', label: 'Staff Lyrics', sample: 'O-de to joy, be-au-ti-ful' },
  { key: 'measureNumbers', label: 'Measure Numbers', sample: '1, 2, 3, 4' },
  { key: 'pageNumbers', label: 'Page Numbers', sample: '- 1 -' },
  { key: 'chordsAndText', label: 'Chords & Text', sample: 'Cmaj7   Dm7   G7' },
  { key: 'staffLabels', label: 'Staff Labels', sample: 'Violin I' },
];

export const FONT_FAMILY_OPTIONS: string[] = [
  'Georgia',
  'Times New Roman',
  'Arial',
  'Helvetica',
  'Verdana',
  'Courier New',
  'Palatino',
];

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const parseOrClamp = (
  raw: string,
  min: number,
  max: number,
  fallback: number
): number => {
  const trimmed = raw.trim();
  if (trimmed === '') return fallback;
  const num = Number(trimmed);
  if (isNaN(num)) return fallback;
  return clamp(num, min, max);
};

export const PageSetupModal: React.FC<PageSetupModalProps> = ({
  isOpen,
  onClose,
  scoreInfo,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'sizing' | 'fonts'>('sizing');
  const [staffScale, setStaffScale] = useState<number>(() => {
    const resolved = resolvePageSetup(scoreInfo.pageSetup);
    return resolved.staffScale;
  });
  const [systemSpacingInput, setSystemSpacingInput] = useState<string>(() => {
    const resolved = resolvePageSetup(scoreInfo.pageSetup);
    return String(resolved.systemSpacing);
  });
  const [staffSpacingInput, setStaffSpacingInput] = useState<string>(() => {
    const resolved = resolvePageSetup(scoreInfo.pageSetup);
    return String(resolved.staffSpacing);
  });
  const [marginsInput, setMarginsInput] = useState<{
    topMm: string;
    bottomMm: string;
    leftMm: string;
    rightMm: string;
  }>(() => {
    const resolved = resolvePageSetup(scoreInfo.pageSetup);
    return {
      topMm: String(resolved.margins.topMm),
      bottomMm: String(resolved.margins.bottomMm),
      leftMm: String(resolved.margins.leftMm),
      rightMm: String(resolved.margins.rightMm),
    };
  });
  const [fonts, setFonts] = useState<ScoreFontsConfig>(() =>
    resolveScoreFonts(scoreInfo.fonts)
  );
  const [selectedCategory, setSelectedCategory] = useState<ScoreFontCategory>('title');
  const [fontSizeInput, setFontSizeInput] = useState<string>(() => {
    const resolvedFonts = resolveScoreFonts(scoreInfo.fonts);
    return String(resolvedFonts.title.sizePt);
  });

  useEffect(() => {
    if (isOpen) {
      const resolvedPage = resolvePageSetup(scoreInfo.pageSetup);
      const resolvedFonts = resolveScoreFonts(scoreInfo.fonts);
      setStaffScale(resolvedPage.staffScale);
      setSystemSpacingInput(String(resolvedPage.systemSpacing));
      setStaffSpacingInput(String(resolvedPage.staffSpacing));
      setMarginsInput({
        topMm: String(resolvedPage.margins.topMm),
        bottomMm: String(resolvedPage.margins.bottomMm),
        leftMm: String(resolvedPage.margins.leftMm),
        rightMm: String(resolvedPage.margins.rightMm),
      });
      setFonts(resolvedFonts);
      setSelectedCategory('title');
      setFontSizeInput(String(resolvedFonts.title.sizePt));
      setActiveTab('sizing');
    }
  }, [isOpen, scoreInfo]);

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

  const currentCategoryMeta = FONT_CATEGORIES.find((c) => c.key === selectedCategory);
  const currentFont: FontSetting = fonts[selectedCategory];

  const handleFontChange = (updates: Partial<FontSetting>) => {
    setFonts((prev) => ({
      ...prev,
      [selectedCategory]: {
        ...prev[selectedCategory],
        ...updates,
      },
    }));
  };

  const handleCategoryChange = (newCat: ScoreFontCategory) => {
    // Commit current font size before switching
    const clampedCurrent = parseOrClamp(
      fontSizeInput,
      8,
      36,
      DEFAULT_SCORE_FONTS[selectedCategory].sizePt
    );
    handleFontChange({ sizePt: clampedCurrent });

    setSelectedCategory(newCat);
    setFontSizeInput(String(fonts[newCat].sizePt));
  };

  const handleFontSizeChange = (val: string) => {
    setFontSizeInput(val);
    const trimmed = val.trim();
    if (trimmed !== '') {
      const num = Number(trimmed);
      if (!isNaN(num)) {
        handleFontChange({ sizePt: clamp(num, 8, 36) });
      }
    }
  };

  const handleFontSizeBlur = () => {
    const clamped = parseOrClamp(
      fontSizeInput,
      8,
      36,
      DEFAULT_SCORE_FONTS[selectedCategory].sizePt
    );
    setFontSizeInput(String(clamped));
    handleFontChange({ sizePt: clamped });
  };

  const handleSystemSpacingBlur = () => {
    const clamped = parseOrClamp(
      systemSpacingInput,
      30,
      180,
      DEFAULT_PAGE_SETUP.systemSpacing
    );
    setSystemSpacingInput(String(clamped));
  };

  const handleStaffSpacingBlur = () => {
    const clamped = parseOrClamp(
      staffSpacingInput,
      30,
      160,
      DEFAULT_PAGE_SETUP.staffSpacing
    );
    setStaffSpacingInput(String(clamped));
  };

  const handleMarginChange = (field: 'topMm' | 'bottomMm' | 'leftMm' | 'rightMm', val: string) => {
    setMarginsInput((prev) => ({ ...prev, [field]: val }));
  };

  const handleMarginBlur = (field: 'topMm' | 'bottomMm' | 'leftMm' | 'rightMm') => {
    setMarginsInput((prev) => {
      const clamped = parseOrClamp(prev[field], 5, 40, DEFAULT_PAGE_SETUP.margins[field]);
      return { ...prev, [field]: String(clamped) };
    });
  };

  const handleResetDefaults = () => {
    setStaffScale(DEFAULT_PAGE_SETUP.staffScale);
    setSystemSpacingInput(String(DEFAULT_PAGE_SETUP.systemSpacing));
    setStaffSpacingInput(String(DEFAULT_PAGE_SETUP.staffSpacing));
    setMarginsInput({
      topMm: String(DEFAULT_PAGE_SETUP.margins.topMm),
      bottomMm: String(DEFAULT_PAGE_SETUP.margins.bottomMm),
      leftMm: String(DEFAULT_PAGE_SETUP.margins.leftMm),
      rightMm: String(DEFAULT_PAGE_SETUP.margins.rightMm),
    });
    setFonts({
      title: { ...DEFAULT_SCORE_FONTS.title },
      subtitle: { ...DEFAULT_SCORE_FONTS.subtitle },
      composer: { ...DEFAULT_SCORE_FONTS.composer },
      lyricist: { ...DEFAULT_SCORE_FONTS.lyricist },
      staffLyrics: { ...DEFAULT_SCORE_FONTS.staffLyrics },
      measureNumbers: { ...DEFAULT_SCORE_FONTS.measureNumbers },
      pageNumbers: { ...DEFAULT_SCORE_FONTS.pageNumbers },
      chordsAndText: { ...DEFAULT_SCORE_FONTS.chordsAndText },
      staffLabels: { ...DEFAULT_SCORE_FONTS.staffLabels },
    });
    setFontSizeInput(String(DEFAULT_SCORE_FONTS[selectedCategory].sizePt));
  };

  const handleApplySave = () => {
    const finalSystemSpacing = parseOrClamp(
      systemSpacingInput,
      30,
      180,
      DEFAULT_PAGE_SETUP.systemSpacing
    );
    const finalStaffSpacing = parseOrClamp(
      staffSpacingInput,
      30,
      160,
      DEFAULT_PAGE_SETUP.staffSpacing
    );
    const finalTopMm = parseOrClamp(
      marginsInput.topMm,
      5,
      40,
      DEFAULT_PAGE_SETUP.margins.topMm
    );
    const finalBottomMm = parseOrClamp(
      marginsInput.bottomMm,
      5,
      40,
      DEFAULT_PAGE_SETUP.margins.bottomMm
    );
    const finalLeftMm = parseOrClamp(
      marginsInput.leftMm,
      5,
      40,
      DEFAULT_PAGE_SETUP.margins.leftMm
    );
    const finalRightMm = parseOrClamp(
      marginsInput.rightMm,
      5,
      40,
      DEFAULT_PAGE_SETUP.margins.rightMm
    );
    const finalFontSize = parseOrClamp(
      fontSizeInput,
      8,
      36,
      DEFAULT_SCORE_FONTS[selectedCategory].sizePt
    );

    const finalPageSetup: PageSetupConfig = {
      staffScale: clamp(staffScale, 0.25, 3.0),
      systemSpacing: finalSystemSpacing,
      staffSpacing: finalStaffSpacing,
      margins: {
        topMm: finalTopMm,
        bottomMm: finalBottomMm,
        leftMm: finalLeftMm,
        rightMm: finalRightMm,
      },
    };

    const finalFonts: ScoreFontsConfig = {
      ...fonts,
      [selectedCategory]: {
        ...fonts[selectedCategory],
        sizePt: finalFontSize,
      },
    };

    onSave(finalPageSetup, finalFonts);
    onClose();
  };

  const staffScalePct = Math.round(staffScale * 100);
  const previewSizePt = parseOrClamp(
    fontSizeInput,
    8,
    36,
    currentFont.sizePt
  );

  return (
    <div
      data-testid="page-setup-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print print:hidden"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5 font-bold text-lg">
            <Sliders className="w-5 h-5 text-blue-400" />
            <span>Page Setup & Typography</span>
          </div>
          <button
            type="button"
            data-testid="page-setup-close-button"
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 shrink-0" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sizing'}
            onClick={() => setActiveTab('sizing')}
            className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sizing'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Staff Sizing & Margins</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'fonts'}
            onClick={() => setActiveTab('fonts')}
            className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'fonts'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Typography / Fonts</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {activeTab === 'sizing' ? (
            <div className="flex flex-col gap-6">
              {/* Staff Scale Section */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="staff-scale"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wide"
                  >
                    Staff Scale
                  </label>
                  <span
                    data-testid="staff-scale-display"
                    className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono text-sm font-bold"
                  >
                    {staffScalePct}%
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  Proportionally scales all staff lines, noteheads, clefs, stems, and accidentals (25% - 200%).
                </p>

                <div className="flex items-center gap-3">
                  <input
                    id="staff-scale"
                    aria-label="Staff Scale"
                    data-testid="staff-scale-slider"
                    type="range"
                    min="25"
                    max="200"
                    step="5"
                    value={staffScalePct}
                    onChange={(e) =>
                      setStaffScale(clamp(Math.round(Number(e.target.value)) / 100, 0.25, 3.0))
                    }
                    className="flex-1 accent-blue-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min="25"
                      max="300"
                      value={staffScalePct}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          setStaffScale(clamp(val / 100, 0.25, 3.0));
                        }
                      }}
                      className="w-16 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-center bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Scale Percentage Input"
                    />
                    <span className="text-xs text-slate-500 font-bold">%</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200">
                  <span className="text-xs font-semibold text-slate-600">Quick Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid="preset-tiny"
                      onClick={() => setStaffScale(0.5)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                        staffScalePct === 50
                          ? 'bg-blue-600 text-white border-blue-600 font-bold'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Tiny (50%)
                    </button>
                    <button
                      type="button"
                      data-testid="preset-small"
                      onClick={() => setStaffScale(0.75)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                        staffScalePct === 75
                          ? 'bg-blue-600 text-white border-blue-600 font-bold'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Compact (75%)
                    </button>
                    <button
                      type="button"
                      data-testid="preset-standard"
                      onClick={() => setStaffScale(1.0)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                        staffScalePct === 100
                          ? 'bg-blue-600 text-white border-blue-600 font-bold'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Standard (100%)
                    </button>
                    <button
                      type="button"
                      data-testid="preset-large"
                      onClick={() => setStaffScale(1.2)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                        staffScalePct === 120
                          ? 'bg-blue-600 text-white border-blue-600 font-bold'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Large (120%)
                    </button>
                  </div>
                </div>
              </div>

              {/* Vertical Spacings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="system-spacing"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1"
                  >
                    System Spacing (px)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">Distance between systems on a page (30 - 180).</p>
                  <input
                    id="system-spacing"
                    aria-label="System Spacing"
                    data-testid="system-spacing-input"
                    type="number"
                    min="30"
                    max="180"
                    value={systemSpacingInput}
                    onChange={(e) => setSystemSpacingInput(e.target.value)}
                    onBlur={handleSystemSpacingBlur}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="staff-spacing"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1"
                  >
                    Staff Spacing (px)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">Distance between multi-staff parts (30 - 160).</p>
                  <input
                    id="staff-spacing"
                    aria-label="Staff Spacing"
                    data-testid="staff-spacing-input"
                    type="number"
                    min="30"
                    max="160"
                    value={staffSpacingInput}
                    onChange={(e) => setStaffSpacingInput(e.target.value)}
                    onBlur={handleStaffSpacingBlur}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Page Margins */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Page Margins (mm)
                </label>
                <p className="text-xs text-slate-500 mb-3">Margins for sheet & PDF layout (5mm to 40mm, default 12mm).</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="top-margin" className="block text-xs font-medium text-slate-600 mb-1">
                      Top Margin (mm)
                    </label>
                    <input
                      id="top-margin"
                      aria-label="Top Margin"
                      data-testid="margin-top-input"
                      type="number"
                      min="5"
                      max="40"
                      value={marginsInput.topMm}
                      onChange={(e) => handleMarginChange('topMm', e.target.value)}
                      onBlur={() => handleMarginBlur('topMm')}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="bottom-margin" className="block text-xs font-medium text-slate-600 mb-1">
                      Bottom Margin (mm)
                    </label>
                    <input
                      id="bottom-margin"
                      aria-label="Bottom Margin"
                      data-testid="margin-bottom-input"
                      type="number"
                      min="5"
                      max="40"
                      value={marginsInput.bottomMm}
                      onChange={(e) => handleMarginChange('bottomMm', e.target.value)}
                      onBlur={() => handleMarginBlur('bottomMm')}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="left-margin" className="block text-xs font-medium text-slate-600 mb-1">
                      Left Margin (mm)
                    </label>
                    <input
                      id="left-margin"
                      aria-label="Left Margin"
                      data-testid="margin-left-input"
                      type="number"
                      min="5"
                      max="40"
                      value={marginsInput.leftMm}
                      onChange={(e) => handleMarginChange('leftMm', e.target.value)}
                      onBlur={() => handleMarginBlur('leftMm')}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="right-margin" className="block text-xs font-medium text-slate-600 mb-1">
                      Right Margin (mm)
                    </label>
                    <input
                      id="right-margin"
                      aria-label="Right Margin"
                      data-testid="margin-right-input"
                      type="number"
                      min="5"
                      max="40"
                      value={marginsInput.rightMm}
                      onChange={(e) => handleMarginChange('rightMm', e.target.value)}
                      onBlur={() => handleMarginBlur('rightMm')}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Category Selector */}
              <div>
                <label
                  htmlFor="font-category"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1"
                >
                  Category
                </label>
                <select
                  id="font-category"
                  aria-label="Category"
                  data-testid="font-category-select"
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value as ScoreFontCategory)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  {FONT_CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Settings for Active Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                {/* Font Family */}
                <div className="sm:col-span-1">
                  <label
                    htmlFor="font-family"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1"
                  >
                    Font Family
                  </label>
                  <select
                    id="font-family"
                    aria-label="Font Family"
                    data-testid="font-family-select"
                    value={currentFont.family}
                    onChange={(e) => handleFontChange({ family: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {FONT_FAMILY_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <label
                    htmlFor="font-size"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1"
                  >
                    Font Size (pt)
                  </label>
                  <input
                    id="font-size"
                    aria-label="Font Size"
                    data-testid="font-size-input"
                    type="number"
                    min="8"
                    max="36"
                    value={fontSizeInput}
                    onChange={(e) => handleFontSizeChange(e.target.value)}
                    onBlur={handleFontSizeBlur}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Bold / Italic Toggles */}
                <div>
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Style
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label="Bold"
                      data-testid="font-bold-toggle"
                      onClick={() => handleFontChange({ bold: !currentFont.bold })}
                      className={`flex-1 py-2 text-sm font-bold rounded border transition-colors cursor-pointer ${
                        currentFont.bold
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      aria-label="Italic"
                      data-testid="font-italic-toggle"
                      onClick={() => handleFontChange({ italic: !currentFont.italic })}
                      className={`flex-1 py-2 text-sm italic font-serif rounded border transition-colors cursor-pointer ${
                        currentFont.italic
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      I
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="border border-slate-200 bg-slate-50 rounded-lg p-5 flex flex-col items-center justify-center min-h-[120px] overflow-hidden">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-3 self-start">
                  Live Preview — {currentCategoryMeta?.label} ({currentFont.family}, {previewSizePt}pt
                  {currentFont.bold ? ', Bold' : ''}
                  {currentFont.italic ? ', Italic' : ''})
                </span>
                <div
                  data-testid="font-preview-text"
                  className="text-slate-900 transition-all select-none text-center max-w-full truncate px-4"
                  style={{
                    fontFamily: currentFont.family,
                    fontSize: `${previewSizePt}pt`,
                    fontWeight: currentFont.bold ? 'bold' : 'normal',
                    fontStyle: currentFont.italic ? 'italic' : 'normal',
                  }}
                >
                  {currentCategoryMeta?.sample}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <button
            type="button"
            data-testid="reset-defaults-button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded bg-white hover:bg-slate-100 transition-colors cursor-pointer w-full sm:w-auto justify-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              data-testid="page-setup-cancel-button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-medium text-sm transition-colors cursor-pointer w-full sm:w-auto text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="page-setup-save-button"
              onClick={handleApplySave}
              className="flex items-center justify-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm shadow-sm transition-colors cursor-pointer w-full sm:w-auto"
            >
              <Check className="w-4 h-4" />
              <span>Apply & Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
