import React, { useRef, useEffect } from 'react';
import { Score, FontSetting } from '../../types/score';
import {
  wrapScoreIntoPages,
  computeJustifiedStaffElementPositions,
  computeMultiMeasureRests,
  computeEffectiveSystemWidth,
} from '../../engine/layout/pagination';
import { resolvePageSetup, resolveScoreFonts, STAFF_HEIGHT } from '../../engine/layout/geometry';
import { StaffSvg } from './StaffSvg';
import { Printer } from 'lucide-react';

interface Props {
  score: Score;
  playbackCursor?: { staffIndex: number; elementIndex: number } | null;
}

function getFontStyle(setting: FontSetting, scale = 1.0): React.CSSProperties {
  return {
    fontFamily: setting.family,
    fontSize: `${Math.round(setting.sizePt * scale * 10) / 10}pt`,
    fontWeight: setting.bold ? 'bold' : 'normal',
    fontStyle: setting.italic ? 'italic' : 'normal',
  };
}

export const PaginatedCanvas: React.FC<Props> = ({ score, playbackCursor }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fonts = resolveScoreFonts(score.info?.fonts);
  const pageSetup = resolvePageSetup(score.info?.pageSetup);
  const systemWidth = computeEffectiveSystemWidth(
    820,
    pageSetup.margins.leftMm,
    pageSetup.margins.rightMm
  );
  const pages = wrapScoreIntoPages(score, {
    systemWidth,
    scale: pageSetup.staffScale,
    systemSpacing: pageSetup.systemSpacing,
    staffSpacing: pageSetup.staffSpacing,
  });

  const centerY = Math.round(STAFF_HEIGHT * pageSetup.staffScale);

  // Auto-scroll to active system during playback
  useEffect(() => {
    if (!playbackCursor) return;
    const playingStaff = score.staves[playbackCursor.staffIndex];
    const playingElem = playingStaff?.elements[playbackCursor.elementIndex];
    if (!playingElem) return;

    // Find the system containing the playing element
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      for (let sysIdx = 0; sysIdx < pages[pageIdx].systems.length; sysIdx++) {
        const sys = pages[pageIdx].systems[sysIdx];
        const staffObj = sys.staves.find((s) => s.staffId === playingStaff.id);
        if (staffObj && staffObj.elements.some((e) => e.id === playingElem.id)) {
          const el = document.getElementById(`page-system-${pageIdx}-${sysIdx}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          return;
        }
      }
    }
  }, [playbackCursor, pages, score.staves]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      ref={scrollContainerRef}
      data-testid="paginated-scroll-container"
      className="flex-1 overflow-y-auto bg-slate-200 p-8 flex flex-col items-center gap-6 print:bg-white print:p-0 print:overflow-visible"
    >
      {/* Print Trigger Button */}
      <div className="w-[820px] flex justify-end no-print print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded shadow hover:bg-slate-800 font-medium text-sm cursor-pointer transition-colors"
        >
          <Printer className="w-4 h-4 text-blue-400" />
          <span>Print to PDF</span>
        </button>
      </div>

      {/* Printable Sheet Pages */}
      {pages.map((page, pageIdx) => (
        <div
          key={pageIdx}
          className="sheet-page bg-white shadow-xl w-[820px] min-h-[1080px] flex flex-col justify-between border border-slate-300 page-break"
          style={{
            paddingTop: `${pageSetup.margins.topMm}mm`,
            paddingBottom: `${pageSetup.margins.bottomMm}mm`,
            paddingLeft: `${pageSetup.margins.leftMm}mm`,
            paddingRight: `${pageSetup.margins.rightMm}mm`,
          }}
        >
          <div>
            {/* Page 1 Score Header */}
            {pageIdx === 0 && (
              <div className="mb-8 border-b pb-4">
                <div className="text-center">
                  <h1 className="text-slate-900" style={getFontStyle(fonts.title)}>
                    {score.info.title || 'Untitled Score'}
                  </h1>
                  {score.info.subtitle && (
                    <p className="text-slate-600 mt-1" style={getFontStyle(fonts.subtitle)}>
                      {score.info.subtitle}
                    </p>
                  )}
                </div>
                <div className="flex justify-between items-end mt-4 text-xs font-serif text-slate-700">
                  <div>
                    {score.info.lyricist && (
                      <div style={getFontStyle(fonts.lyricist)}>Words: {score.info.lyricist}</div>
                    )}
                    <div>Tempo: ♩ = {score.info.tempo}</div>
                  </div>
                  <div className="text-right">
                    {score.info.composer && (
                      <div style={getFontStyle(fonts.composer)}>Music: {score.info.composer}</div>
                    )}
                    {score.info.arranger && (
                      <div style={getFontStyle(fonts.composer)}>Arr.: {score.info.arranger}</div>
                    )}
                    {score.info.dateText && (
                      <div style={getFontStyle(fonts.composer)} data-testid="score-header-date">
                        {score.info.dateType === 'composed'
                          ? `Comp.: ${score.info.dateText}`
                          : score.info.dateType === 'arranged'
                          ? `Arr.: ${score.info.dateText}`
                          : score.info.dateType === 'transcribed'
                          ? `Transcr.: ${score.info.dateText}`
                          : score.info.dateText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Systems */}
            <div className="flex flex-col" style={{ gap: `${pageSetup.systemSpacing}px` }}>
              {page.systems.map((system, sysIdx) => (
                <div
                  key={sysIdx}
                  id={`page-system-${pageIdx}-${sysIdx}`}
                  data-testid="paginated-system"
                  className="relative flex items-stretch"
                >
                  {/* System staves */}
                  <div
                    data-testid="multi-staff-container"
                    className="flex-1 flex flex-col pl-2 relative"
                    style={{ gap: `${pageSetup.staffSpacing}px` }}
                  >
                    {/* System Measure Number Badge (omitting Measure 1 on System 1 of Page 1) */}
                    {!(pageIdx === 0 && sysIdx === 0) &&
                      score.info.measureNumbering !== 'none' &&
                      system.startMeasureNumber !== undefined &&
                      (score.info.measureNumbering !== 'interval-5' || system.startMeasureNumber % 5 === 0) && (
                        <div
                          data-testid="system-measure-number"
                          className="absolute -top-3.5 left-2 bg-white border border-slate-400 rounded px-1 py-0.5 leading-none select-none z-10"
                          style={getFontStyle(fonts.measureNumbers)}
                        >
                          {system.startMeasureNumber}
                        </div>
                      )}
                    {system.staves.map((staffObj) => {
                      const fullStaff =
                        score.staves.find((s) => s.id === staffObj.staffId) || score.staves[0];
                      const childSubstaff = score.staves.find((s) => s.substaffOf === fullStaff.id);
                      const positionedElements =
                        staffObj.positionedElements ||
                        computeJustifiedStaffElementPositions(
                          staffObj.elements,
                          systemWidth,
                          system.isLastSystem,
                          undefined,
                          undefined,
                          pageSetup.staffScale
                        );
                      const multiMeasureRests =
                        staffObj.multiMeasureRests ||
                        (score.info.multiMeasureRests
                          ? computeMultiMeasureRests(positionedElements)
                          : undefined);
                      return (
                        <div key={staffObj.staffId} className="relative">
                          {pageIdx === 0 && sysIdx === 0 && fullStaff.name && (
                            <div
                              data-testid="staff-label"
                              className="absolute -top-3.5 left-1 text-slate-700 select-none z-10 pointer-events-none font-semibold"
                              style={getFontStyle(fonts.staffLabels, pageSetup.staffScale)}
                            >
                              {fullStaff.name}
                            </div>
                          )}
                          <StaffSvg
                            staff={{ ...fullStaff, elements: staffObj.elements }}
                            isActive={false}
                            centerY={centerY}
                            width={systemWidth}
                            cursorIndex={0}
                            pitchOffset={0}
                            onStaffClick={() => {}}
                            positionedElements={positionedElements}
                            isMergedSubstaff={Boolean(childSubstaff)}
                            substaffElements={childSubstaff ? (staffObj.substaffElements ?? []) : undefined}
                            substaffPositionedElements={staffObj.substaffPositionedElements}
                            multiMeasureRests={multiMeasureRests}
                            fullStaffElements={fullStaff.elements}
                            scale={pageSetup.staffScale}
                            fonts={fonts}
                            autoBeaming={score.info.autoBeaming === true}
                          />
                        </div>
                      );
                    })}

                    {/* Continuous system barlines connecting grouped staves */}
                    {system.staves.length > 1 && score.info.connectStaves !== false && (() => {
                      const topStaffPos =
                        system.staves[0].positionedElements ||
                        computeJustifiedStaffElementPositions(
                          system.staves[0].elements,
                          systemWidth,
                          system.isLastSystem,
                          undefined,
                          undefined,
                          pageSetup.staffScale
                        );
                      const topStaffMm =
                        system.staves[0].multiMeasureRests ||
                        (score.info.multiMeasureRests
                          ? computeMultiMeasureRests(topStaffPos)
                          : undefined);
                      const hiddenBarIds = new Set(topStaffMm?.flatMap((mm) => mm.hiddenElementIds) || []);
                      const barPositions = topStaffPos.filter(
                        (p) => p.element.type === 'bar' && !hiddenBarIds.has(p.element.id)
                      );

                      const scale = pageSetup.staffScale;
                      const staffSpacing = pageSetup.staffSpacing;
                      const staffStride = centerY * 2 + staffSpacing;

                      const isBeamedWithNext = (staffIdx: number) => {
                        const s = score.staves.find((st) => st.id === system.staves[staffIdx]?.staffId);
                        return s?.beamWithNext ?? true;
                      };

                      return (
                        <svg
                          className="absolute inset-0 left-2 pointer-events-none w-full h-full overflow-visible"
                          aria-hidden="true"
                        >
                          {/* Single clean start barline for each staff */}
                          {system.staves.map((_, sIdx) => {
                            const yTop = Math.round(sIdx * staffStride + centerY - 20 * scale);
                            const yBottom = Math.round(sIdx * staffStride + centerY + 20 * scale);
                            return (
                              <line
                                key={`start-staff-${sIdx}`}
                                x1={0}
                                y1={yTop}
                                x2={0}
                                y2={yBottom}
                                stroke="#0f172a"
                                strokeWidth="1.2"
                              />
                            );
                          })}

                          {/* Connected start barline between beamed staves */}
                          {Array.from({ length: system.staves.length - 1 }).map((_, gapIdx) => {
                            if (!isBeamedWithNext(gapIdx)) return null;
                            const y1 = Math.round(gapIdx * staffStride + centerY + 20 * scale);
                            const y2 = Math.round((gapIdx + 1) * staffStride + centerY - 20 * scale);
                            return (
                              <line
                                key={`start-conn-gap-${gapIdx}`}
                                x1={0}
                                y1={y1}
                                x2={0}
                                y2={y2}
                                stroke="#0f172a"
                                strokeWidth="1.2"
                                data-testid="system-bracket"
                              />
                            );
                          })}

                          {barPositions.map((bp) => {
                            const barEl = bp.element as import('../../types/score').BarLineElement;
                            const barType = barEl.barType || 'single';

                            return Array.from({ length: system.staves.length - 1 }).map((_, gapIdx) => {
                              if (!isBeamedWithNext(gapIdx)) return null;
                              const y1 = Math.round(gapIdx * staffStride + centerY + 20 * scale);
                              const y2 = Math.round((gapIdx + 1) * staffStride + centerY - 20 * scale);

                              if (barType === 'double') {
                                return (
                                  <g key={`conn-${bp.element.id}-gap-${gapIdx}`}>
                                    <line x1={bp.x + 8} y1={y1} x2={bp.x + 8} y2={y2} stroke="#0f172a" strokeWidth="1.5" data-testid="system-barline-connector" />
                                    <line x1={bp.x + 13} y1={y1} x2={bp.x + 13} y2={y2} stroke="#0f172a" strokeWidth="1.5" data-testid="system-barline-connector" />
                                  </g>
                                );
                              }
                              if (barType === 'final') {
                                return (
                                  <g key={`conn-${bp.element.id}-gap-${gapIdx}`}>
                                    <line x1={bp.x + 8} y1={y1} x2={bp.x + 8} y2={y2} stroke="#0f172a" strokeWidth="1.5" data-testid="system-barline-connector" />
                                    <line x1={bp.x + 13} y1={y1} x2={bp.x + 13} y2={y2} stroke="#0f172a" strokeWidth="3.5" data-testid="system-barline-connector" />
                                  </g>
                                );
                              }
                              if (barType === 'repeat-start') {
                                return (
                                  <g key={`conn-${bp.element.id}-gap-${gapIdx}`}>
                                    <line x1={bp.x + 5} y1={y1} x2={bp.x + 5} y2={y2} stroke="#0f172a" strokeWidth="3.5" data-testid="system-barline-connector" />
                                    <line x1={bp.x + 10} y1={y1} x2={bp.x + 10} y2={y2} stroke="#0f172a" strokeWidth="1.5" data-testid="system-barline-connector" />
                                  </g>
                                );
                              }
                              if (barType === 'repeat-end') {
                                return (
                                  <g key={`conn-${bp.element.id}-gap-${gapIdx}`}>
                                    <line x1={bp.x + 10} y1={y1} x2={bp.x + 10} y2={y2} stroke="#0f172a" strokeWidth="1.5" data-testid="system-barline-connector" />
                                    <line x1={bp.x + 14} y1={y1} x2={bp.x + 14} y2={y2} stroke="#0f172a" strokeWidth="3.5" data-testid="system-barline-connector" />
                                  </g>
                                );
                              }
                              if (barType === 'repeat-both') {
                                return (
                                  <g key={`conn-${bp.element.id}-gap-${gapIdx}`}>
                                    <line x1={bp.x + 8} y1={y1} x2={bp.x + 8} y2={y2} stroke="#0f172a" strokeWidth="1.5" data-testid="system-barline-connector" />
                                    <line x1={bp.x + 12} y1={y1} x2={bp.x + 12} y2={y2} stroke="#0f172a" strokeWidth="3.5" data-testid="system-barline-connector" />
                                    <line x1={bp.x + 16} y1={y1} x2={bp.x + 16} y2={y2} stroke="#0f172a" strokeWidth="1.5" data-testid="system-barline-connector" />
                                  </g>
                                );
                              }

                              return (
                                <line
                                  key={`conn-${bp.element.id}-gap-${gapIdx}`}
                                  x1={bp.x + 10}
                                  y1={y1}
                                  x2={bp.x + 10}
                                  y2={y2}
                                  stroke="#0f172a"
                                  strokeWidth="1.5"
                                  data-testid="system-barline-connector"
                                />
                              );
                            });
                          })}
                        </svg>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-slate-500 mt-6 border-t pt-2 flex flex-col items-center gap-1 shrink-0">
            <div style={getFontStyle(fonts.pageNumbers)}>— {pageIdx + 1} —</div>
            <div className="text-xs font-serif">
              {score.info.copyright || `© ${new Date().getFullYear()} NoteationWeb`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
