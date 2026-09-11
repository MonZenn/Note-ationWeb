import React from 'react';
import { MusicElement, ClefType, TempoBaseDuration, ScoreFontsConfig } from '../../types/score';

import {
  calculatePitchY,
  calculateLedgerLines,
  STAFF_HEIGHT,
  getEffectiveStemDirection,
  KEY_SIGNATURE_OFFSETS,
} from '../../engine/layout/geometry';
import { REST_GLYPHS, MUSIC_GLYPHS } from '../../utils/musicGlyphs';

export { getEffectiveStemDirection };

interface Props {
  element: MusicElement;
  x?: number;
  centerY?: number;
  clef?: ClefType;
  width?: number;
  scale?: number;
  fonts?: ScoreFontsConfig;
  beamInfo?: {
    isBeamed: boolean;
    stemDirection: 'up' | 'down';
    stemTipY: number;
  };
  isSelected?: boolean;
  voice?: 'voice-1' | 'voice-2';
  noteheadShift?: number;
}

export const ElementSvg: React.FC<Props> = ({
  element,
  x = 0,
  centerY = 50,
  clef = 'treble',
  width,
  scale = 1.0,
  fonts,
  beamInfo,
  isSelected = false,
  voice,
  noteheadShift = 0,
}) => {

  if (element.type === 'note') {
    const isHollow = element.duration <= 2;
    const isWhole = element.duration === 1;
    const voiceScale = voice === 'voice-2' ? 0.7 : 1.0;
    const noteheadScale = scale * voiceScale;
    const shiftX = noteheadShift || 0;

    const offsets = element.pitches.map((p) => p.diatonicOffset);
    const minOffset = offsets.length > 0 ? Math.min(...offsets) : 0;
    const maxOffset = offsets.length > 0 ? Math.max(...offsets) : 0;
    const topPitchY = calculatePitchY(centerY, maxOffset, scale);
    const bottomPitchY = calculatePitchY(centerY, minOffset, scale);

    const isDown = beamInfo?.isBeamed
      ? beamInfo.stemDirection === 'down'
      : getEffectiveStemDirection(element, voice) === 'down';

    // Calculate vertical positions for articulations
    const articDir = isDown ? -1 : 1;
    let articOffset = isDown ? topPitchY - 10 * noteheadScale : bottomPitchY + 10 * noteheadScale;

    const staccatoY = articOffset;
    if (element.staccato) articOffset += articDir * 6 * noteheadScale;

    const tenutoY = articOffset;
    if (element.tenuto) articOffset += articDir * 6 * noteheadScale;

    const accentY = articOffset;
    if (element.accent) articOffset += articDir * 6 * noteheadScale;

    const marcatoY = articOffset;
    if (element.marcato) articOffset += articDir * 6 * noteheadScale;

    const staccatissimoY = articOffset;
    if (element.staccatissimo) articOffset += articDir * 6 * noteheadScale;

    // Staff-top elevated elements (fermata, ornaments)
    let elevatedY = Math.min(centerY - 28 * scale, (isDown ? topPitchY : topPitchY - 28 * scale) - 8 * scale);

    const ornamentY = elevatedY;
    if (element.ornament) elevatedY -= 14 * scale;

    const fermataY = elevatedY;

    // Tie & Slur coordinates
    const tieY = bottomPitchY + 8 * noteheadScale;
    const slurY = isDown ? topPitchY - 4.5 * scale : bottomPitchY + 4.5 * scale;
    const noteheadCenterX = 7 * scale + shiftX;
    const noteheadRx = (isWhole ? 7.5 : 6.2) * noteheadScale;
    const ledgerX1 = -4 * scale + shiftX;
    const ledgerX2 = 18 * scale + shiftX;
    const accidentalX = -10 * scale + shiftX;

    return (
      <g transform={`translate(${x}, 0)`} data-testid="note-element">
        {element.pitches.map((pitch, idx) => {
          const y = calculatePitchY(centerY, pitch.diatonicOffset, scale);
          const ledgers = calculateLedgerLines(pitch.diatonicOffset);

          return (
            <g key={idx}>
              {/* Ledger lines */}
              {ledgers.map((lStep) => (
                <line
                  key={lStep}
                  x1={ledgerX1}
                  y1={calculatePitchY(centerY, lStep, scale)}
                  x2={ledgerX2}
                  y2={calculatePitchY(centerY, lStep, scale)}
                  stroke="#334155"
                  strokeWidth={1.5 * voiceScale}
                />
              ))}

              {/* Accidental */}
              {pitch.accidental === 'sharp' && (
                <text x={accidentalX} y={y + 5 * noteheadScale} fontSize={`${Math.round(14 * noteheadScale)}px`} fill="#0f172a">
                  ♯
                </text>
              )}
              {pitch.accidental === 'flat' && (
                <text x={accidentalX} y={y + 4 * noteheadScale} fontSize={`${Math.round(14 * noteheadScale)}px`} fill="#0f172a">
                  ♭
                </text>
              )}
              {pitch.accidental === 'natural' && (
                <text x={accidentalX} y={y + 5 * noteheadScale} fontSize={`${Math.round(14 * noteheadScale)}px`} fill="#0f172a">
                  ♮
                </text>
              )}

              {/* Notehead */}
              <ellipse
                cx={noteheadCenterX}
                cy={y}
                rx={noteheadRx}
                ry={4.2 * noteheadScale}
                transform={`rotate(-20, ${noteheadCenterX}, ${y})`}
                fill={isHollow ? 'none' : '#0f172a'}
                stroke="#0f172a"
                strokeWidth={isHollow ? 1.8 * voiceScale : 0}
              />
            </g>
          );
        })}

        {/* Augmentation dots */}
        {element.dots > 0 &&
          element.pitches.map((pitch, pIdx) => {
            const y = calculatePitchY(centerY, pitch.diatonicOffset, scale);
            const dotStartX = 18 * scale + shiftX;
            return Array.from({ length: element.dots }).map((_, dotIdx) => (
              <circle
                key={`dot-${pIdx}-${dotIdx}`}
                cx={dotStartX + dotIdx * 5 * voiceScale}
                cy={y}
                r={2 * voiceScale}
                fill="#0f172a"
              />
            ));
          })}

        {/* Stem (if not whole note) */}
        {!isWhole && element.pitches.length > 0 && (() => {
          const xPos = (isDown ? 1.5 : 12.5) * scale + shiftX;
          const y1 = isDown ? topPitchY : bottomPitchY;
          const y2 = beamInfo?.isBeamed
            ? beamInfo.stemTipY
            : isDown
            ? bottomPitchY + 32 * noteheadScale
            : topPitchY - 32 * noteheadScale;

          return (
            <line
              x1={xPos}
              y1={y1}
              x2={xPos}
              y2={y2}
              stroke="#0f172a"
              strokeWidth={1.6 * voiceScale}
            />
          );
        })()}

        {/* Flags for 8th, 16th, and 32nd notes (suppressed when beamed) */}
        {!beamInfo?.isBeamed && element.duration >= 8 && element.pitches.length > 0 && (() => {
          const xPos = (isDown ? 1.5 : 12.5) * scale + shiftX;
          const yTip = isDown ? bottomPitchY + 32 * noteheadScale : topPitchY - 32 * noteheadScale;
          const flagCount = element.duration === 8 ? 1 : element.duration === 16 ? 2 : 3;

          return Array.from({ length: flagCount }).map((_, fIdx) => {
            const flagY = isDown ? yTip - fIdx * 5 * noteheadScale : yTip + fIdx * 5 * noteheadScale;
            const pathD = isDown
              ? `M ${xPos} ${flagY} C ${xPos + 6 * voiceScale} ${flagY - 4 * noteheadScale}, ${xPos + 8 * voiceScale} ${flagY - 10 * noteheadScale}, ${xPos + 9 * voiceScale} ${flagY - 14 * noteheadScale}`
              : `M ${xPos} ${flagY} C ${xPos + 6 * voiceScale} ${flagY + 4 * noteheadScale}, ${xPos + 8 * voiceScale} ${flagY + 10 * noteheadScale}, ${xPos + 9 * voiceScale} ${flagY + 14 * noteheadScale}`;

            return (
              <path
                key={`flag-${fIdx}`}
                d={pathD}
                fill="none"
                stroke="#0f172a"
                strokeWidth={1.8 * voiceScale}
                strokeLinecap="round"
                data-testid="note-flag"
              />
            );
          });
        })()}

        {/* Articulations: Staccato dot */}
        {element.staccato && (
          <circle cx={noteheadCenterX} cy={staccatoY} r={2 * voiceScale} fill="#0f172a" data-testid="staccato-dot" data-y={staccatoY} />
        )}

        {/* Articulations: Tenuto line */}
        {element.tenuto && (
          <line
            x1={2 * scale + shiftX}
            y1={tenutoY}
            x2={12 * scale + shiftX}
            y2={tenutoY}
            stroke="#0f172a"
            strokeWidth={1.8 * voiceScale}
            strokeLinecap="round"
            data-testid="tenuto-line"
            data-y={tenutoY}
          />
        )}

        {/* Articulations: Accent mark (>) */}
        {element.accent && (
          <path
            d={MUSIC_GLYPHS.accent}
            transform={`translate(${noteheadCenterX - 7 * noteheadScale}, ${accentY}) scale(${noteheadScale})`}
            fill="none"
            stroke="#0f172a"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            data-testid="accent-mark"
            data-y={accentY}
          />
        )}

        {/* Articulations: Marcato mark (^) */}
        {element.marcato && (
          <path
            d={MUSIC_GLYPHS.marcato}
            transform={`translate(${shiftX}, ${marcatoY}) scale(${voiceScale})`}
            fill="none"
            stroke="#0f172a"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            data-testid="marcato-mark"
            data-y={marcatoY}
          />
        )}

        {/* Articulations: Staccatissimo wedge */}
        {element.staccatissimo && (
          <path
            d={MUSIC_GLYPHS.staccatissimo}
            transform={`translate(${shiftX}, ${staccatissimoY - 3}) scale(${voiceScale})`}
            fill="#0f172a"
            data-testid="staccatissimo-mark"
            data-y={staccatissimoY}
          />
        )}

        {/* Holds & Pauses: Fermata */}
        {element.fermata && (
          <path
            d={MUSIC_GLYPHS.fermata}
            transform={`translate(0, ${fermataY})`}
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.8"
            strokeLinecap="round"
            data-testid="fermata-mark"
            data-y={fermataY}
          />
        )}

        {/* Melodic Ornaments: Trill */}
        {element.ornament === 'trill' && (
          <path
            d={MUSIC_GLYPHS.trill}
            transform={`translate(0, ${ornamentY})`}
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            data-testid="ornament-trill"
            data-y={ornamentY}
          />
        )}

        {/* Melodic Ornaments: Mordent */}
        {element.ornament === 'mordent' && (
          <path
            d={MUSIC_GLYPHS.mordent}
            transform={`translate(0, ${ornamentY})`}
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            data-testid="ornament-mordent"
            data-y={ornamentY}
          />
        )}

        {/* Melodic Ornaments: Turn */}
        {element.ornament === 'turn' && (
          <path
            d={MUSIC_GLYPHS.turn}
            transform={`translate(0, ${ornamentY})`}
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.8"
            strokeLinecap="round"
            data-testid="ornament-turn"
            data-y={ornamentY}
          />
        )}

        {/* Tie Out Curve */}
        {element.tieOut && (
          <path
            d={`M 14 ${tieY} C 20 ${tieY + 7 * scale}, 30 ${tieY + 7 * scale}, 36 ${tieY}`}
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.8"
            data-testid="tie-curve"
          />
        )}

        {/* Slur Out Curve (legacy single-note fallback) */}
        {element.slurOut && !element.slur && (
          <path
            d={
              isDown
                ? `M ${7 * scale + shiftX} ${slurY} C ${16 * scale + shiftX} ${slurY - 14 * scale}, ${26 * scale + shiftX} ${slurY - 14 * scale}, ${34 * scale + shiftX} ${slurY}`
                : `M ${7 * scale + shiftX} ${slurY} C ${16 * scale + shiftX} ${slurY + 14 * scale}, ${26 * scale + shiftX} ${slurY + 14 * scale}, ${34 * scale + shiftX} ${slurY}`
            }
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.8"
            data-testid="slur-curve"
          />
        )}
      </g>
    );
  }

  if (element.type === 'rest') {
    const isWholeRest = element.duration === 1;
    const isHalfRest = element.duration === 2;
    const voiceScale = voice === 'voice-2' ? 0.7 : 1.0;
    const restScale = scale * voiceScale;

    const restPath = REST_GLYPHS[element.duration] || MUSIC_GLYPHS.quarterRest;
    const voiceOffset = voice === 'voice-1' ? -6 * scale : voice === 'voice-2' ? 6 * scale : 0;
    const yOffset = centerY - 40 + voiceOffset;

    return (
      <g transform={`translate(${x}, 0)`} data-testid="rest-element">
        {isWholeRest && (
          <rect
            x={4}
            y={centerY - 10 * scale + voiceOffset}
            width={Math.round(12 * restScale)}
            height={Math.round(6 * restScale)}
            fill="#0f172a"
          />
        )}
        {isHalfRest && (
          <rect
            x={4}
            y={centerY - 6 * scale + voiceOffset}
            width={Math.round(12 * restScale)}
            height={Math.round(6 * restScale)}
            fill="#0f172a"
          />
        )}
        {!isWholeRest && !isHalfRest && (
          <path
            d={restPath}
            transform={
              voice === 'voice-2'
                ? `translate(0, ${yOffset}) scale(0.7)`
                : yOffset !== 0
                ? `translate(0, ${yOffset})`
                : undefined
            }
            fill="#0f172a"
            data-testid={`rest-${element.duration}`}
          />
        )}
        {element.dots > 0 &&
          Array.from({ length: element.dots }).map((_, dotIdx) => (
            <circle
              key={`rest-dot-${dotIdx}`}
              cx={20 + dotIdx * 5 * voiceScale}
              cy={centerY - 5 * scale + voiceOffset}
              r={2 * voiceScale}
              fill="#0f172a"
            />
          ))}
        {element.fermata && (
          <path
            d={MUSIC_GLYPHS.fermata}
            transform={`translate(3, ${centerY - 28 * scale}) scale(${voiceScale})`}
            fill="none"
            stroke="#0f172a"
            strokeWidth={1.8}
            strokeLinecap="round"
            data-testid="fermata-mark"
            data-y={centerY - 28}
          />
        )}
      </g>
    );
  }

  if (element.type === 'bar') {
    const topY = centerY - (STAFF_HEIGHT * scale) / 2;
    const bottomY = centerY + (STAFF_HEIGHT * scale) / 2;
    const dotRadius = 2;
    const dotTopY = centerY - 5 * scale;
    const dotBottomY = centerY + 5 * scale;

    if (element.barType === 'repeat-start') {
      return (
        <g transform={`translate(${x}, 0)`} data-testid="bar-element">
          <g data-testid="bar-repeat-start">
            <line x1={5} y1={topY} x2={5} y2={bottomY} stroke="#0f172a" strokeWidth="3.5" />
            <line x1={10} y1={topY} x2={10} y2={bottomY} stroke="#0f172a" strokeWidth="1.5" />
            <circle cx={15} cy={dotTopY} r={dotRadius} fill="#0f172a" data-testid="repeat-dot" />
            <circle cx={15} cy={dotBottomY} r={dotRadius} fill="#0f172a" data-testid="repeat-dot" />
          </g>
        </g>
      );
    }

    if (element.barType === 'repeat-end') {
      return (
        <g transform={`translate(${x}, 0)`} data-testid="bar-element">
          <g data-testid="bar-repeat-end">
            <circle cx={5} cy={dotTopY} r={dotRadius} fill="#0f172a" data-testid="repeat-dot" />
            <circle cx={5} cy={dotBottomY} r={dotRadius} fill="#0f172a" data-testid="repeat-dot" />
            <line x1={10} y1={topY} x2={10} y2={bottomY} stroke="#0f172a" strokeWidth="1.5" />
            <line x1={14} y1={topY} x2={14} y2={bottomY} stroke="#0f172a" strokeWidth="3.5" />
          </g>
        </g>
      );
    }

    if (element.barType === 'repeat-both') {
      return (
        <g transform={`translate(${x}, 0)`} data-testid="bar-element">
          <g data-testid="bar-repeat-both">
            <circle cx={4} cy={dotTopY} r={dotRadius} fill="#0f172a" data-testid="repeat-dot" />
            <circle cx={4} cy={dotBottomY} r={dotRadius} fill="#0f172a" data-testid="repeat-dot" />
            <line x1={8} y1={topY} x2={8} y2={bottomY} stroke="#0f172a" strokeWidth="1.5" />
            <line x1={12} y1={topY} x2={12} y2={bottomY} stroke="#0f172a" strokeWidth="3.5" />
            <line x1={16} y1={topY} x2={16} y2={bottomY} stroke="#0f172a" strokeWidth="1.5" />
            <circle cx={20} cy={dotTopY} r={dotRadius} fill="#0f172a" data-testid="repeat-dot" />
            <circle cx={20} cy={dotBottomY} r={dotRadius} fill="#0f172a" data-testid="repeat-dot" />
          </g>
        </g>
      );
    }

    if (element.barType === 'final') {
      return (
        <g transform={`translate(${x}, 0)`} data-testid="bar-element">
          <g data-testid="bar-final">
            <line x1={8} y1={topY} x2={8} y2={bottomY} stroke="#0f172a" strokeWidth="1.5" />
            <line x1={13} y1={topY} x2={13} y2={bottomY} stroke="#0f172a" strokeWidth="3.5" />
          </g>
        </g>
      );
    }

    if (element.barType === 'double') {
      return (
        <g transform={`translate(${x}, 0)`} data-testid="bar-element">
          <g data-testid="bar-double">
            <line x1={8} y1={topY} x2={8} y2={bottomY} stroke="#0f172a" strokeWidth="1.5" />
            <line x1={13} y1={topY} x2={13} y2={bottomY} stroke="#0f172a" strokeWidth="1.5" />
          </g>
        </g>
      );
    }

    return (
      <g transform={`translate(${x}, 0)`} data-testid="bar-element">
        <line x1={10} y1={topY} x2={10} y2={bottomY} stroke="#0f172a" strokeWidth="1.5" />
      </g>
    );
  }

  if (element.type === 'volta') {
    const bracketWidth = width ?? 60;
    const bracketY = centerY - 28;
    const tickBottomY = centerY - 18;
    const label = element.text || (element.endings.length > 0 ? `${element.endings.join(', ')}.` : '1.');
    const isClosed = element.closed !== false;

    return (
      <g transform={`translate(${x}, 0)`} data-testid="volta-element">
        {/* Left downward tick */}
        <line
          x1={0}
          y1={bracketY}
          x2={0}
          y2={tickBottomY}
          stroke="#0f172a"
          strokeWidth="1.5"
          data-testid="volta-left-tick"
        />
        {/* Horizontal bracket line */}
        <line
          x1={0}
          y1={bracketY}
          x2={bracketWidth}
          y2={bracketY}
          stroke="#0f172a"
          strokeWidth="1.5"
          data-testid="volta-line"
        />
        {/* Label text */}
        <text
          x={5}
          y={bracketY + 9}
          fontSize="11"
          fontWeight="bold"
          fill="#0f172a"
          data-testid="volta-text"
        >
          {label}
        </text>
        {/* Right downward tick if closed */}
        {isClosed && (
          <line
            x1={bracketWidth}
            y1={bracketY}
            x2={bracketWidth}
            y2={tickBottomY}
            stroke="#0f172a"
            strokeWidth="1.5"
            data-testid="volta-right-tick"
          />
        )}
      </g>
    );
  }

  if (element.type === 'flow') {
    const markY = centerY - 24;

    if (element.mark === 'segno') {
      return (
        <g transform={`translate(${x}, 0)`} data-testid="flow-element" data-flow-mark="segno">
          <path
            d={MUSIC_GLYPHS.segno}
            stroke="#0f172a"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            transform={`translate(4, ${markY - 14}) scale(0.9)`}
            data-testid="flow-segno"
          />
        </g>
      );
    }

    if (element.mark === 'coda') {
      return (
        <g transform={`translate(${x}, 0)`} data-testid="flow-element" data-flow-mark="coda">
          <path
            d={MUSIC_GLYPHS.coda}
            stroke="#0f172a"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            transform={`translate(4, ${markY - 13}) scale(0.9)`}
            data-testid="flow-coda"
          />
        </g>
      );
    }

    if (element.mark === 'to-coda') {
      return (
        <g transform={`translate(${x}, 0)`} data-testid="flow-element" data-flow-mark="to-coda">
          <text
            x={0}
            y={markY}
            fontSize="12"
            fontStyle="italic"
            fontWeight="bold"
            fill="#0f172a"
            data-testid="flow-text"
          >
            To Coda
          </text>
          <path
            d={MUSIC_GLYPHS.coda}
            stroke="#0f172a"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            transform={`translate(48, ${markY - 10}) scale(0.7)`}
            data-testid="flow-coda"
          />
        </g>
      );
    }

    const flowLabels: Record<string, string> = {
      'ds-al-coda': 'D.S. al Coda',
      'ds-al-fine': 'D.S. al Fine',
      'dc-al-coda': 'D.C. al Coda',
      'dc-al-fine': 'D.C. al Fine',
      fine: 'Fine',
    };

    const label = flowLabels[element.mark] || element.mark;

    return (
      <g transform={`translate(${x}, 0)`} data-testid="flow-element" data-flow-mark={element.mark}>
        <text
          x={0}
          y={markY}
          fontSize="12"
          fontStyle="italic"
          fontWeight="bold"
          fill="#0f172a"
          data-testid="flow-text"
        >
          {label}
        </text>
      </g>
    );
  }

  if (element.type === 'clef') {
    const clefGlyphs: Record<string, string> = {
      treble: '𝄞',
      bass: '𝄢',
      alto: '𝄡',
      tenor: '𝄡',
    };
    const glyph = clefGlyphs[element.clefType] || '𝄞';
    const isTreble = element.clefType === 'treble';
    return (
      <g transform={`translate(${x}, 0)`} data-testid="inline-clef">
        <text
          x={14 * scale}
          y={isTreble ? centerY + 13 * scale : centerY + 5 * scale}
          fontSize={isTreble ? `${Math.round(38 * scale)}px` : `${Math.round(30 * scale)}px`}
          fontWeight="bold"
          fill="#0f172a"
          textAnchor="middle"
        >
          {glyph}
        </text>
      </g>
    );
  }

  if (element.type === 'key') {
    const count = Math.abs(element.accidentalsCount);
    const isFlat = element.accidentalsCount < 0 || element.key.includes('b') || element.key.includes('Flat');
    const symbol = isFlat ? '♭' : '♯';
    const activeClef = clef || 'treble';
    const offsetList = isFlat
      ? (KEY_SIGNATURE_OFFSETS[activeClef]?.flats || KEY_SIGNATURE_OFFSETS.treble.flats)
      : (KEY_SIGNATURE_OFFSETS[activeClef]?.sharps || KEY_SIGNATURE_OFFSETS.treble.sharps);

    const cancelIndices =
      element.cancelIndices && element.cancelIndices.length > 0
        ? element.cancelIndices
        : element.cancelCount && element.cancelCount > 0
        ? Array.from({ length: element.cancelCount }, (_, i) => i)
        : [];
    const effectiveCancelCount = cancelIndices.length;
    const cancelType = element.cancelType || (isFlat ? 'sharp' : 'flat');
    const cancelOffsetList = cancelType === 'flat'
      ? (KEY_SIGNATURE_OFFSETS[activeClef]?.flats || KEY_SIGNATURE_OFFSETS.treble.flats)
      : (KEY_SIGNATURE_OFFSETS[activeClef]?.sharps || KEY_SIGNATURE_OFFSETS.treble.sharps);

    return (
      <g
        transform={`translate(${x}, 0)`}
        data-testid="inline-key"
        data-key-accidentals={element.accidentalsCount}
        data-key-name={element.key}
        data-cancel-count={effectiveCancelCount}
      >
        {/* Render cancellation naturals if present */}
        {cancelIndices.map((offsetIdx, idx) => {
          const offset = cancelOffsetList[offsetIdx % cancelOffsetList.length];
          const pitchY = calculatePitchY(centerY, offset, scale);
          const yPos = pitchY + 4 * scale;
          return (
            <text
              key={`cancel-${idx}`}
              x={2 * scale + idx * 9 * scale}
              y={yPos}
              fontSize={`${Math.round(14 * scale)}px`}
              fill="#475569"
              data-testid="cancellation-natural"
              data-cancel-pitch-index={offsetIdx}
            >
              ♮
            </text>
          );
        })}

        {/* Render active key accidentals */}
        {count === 0 && effectiveCancelCount === 0 ? (
          <text x={8 * scale} y={centerY + 4 * scale} fontSize={`${Math.round(14 * scale)}px`} fill="#64748b">♮</text>
        ) : (
          Array.from({ length: count }).map((_, idx) => {
            const offset = offsetList[idx % offsetList.length];
            const pitchY = calculatePitchY(centerY, offset, scale);
            const yPos = pitchY + (isFlat ? 4 * scale : 5 * scale);
            const startX = 2 * scale + (effectiveCancelCount * 9 * scale);
            return (
              <text
                key={idx}
                x={startX + idx * 9 * scale}
                y={yPos}
                fontSize={`${Math.round(14 * scale)}px`}
                fill="#0f172a"
              >
                {symbol}
              </text>
            );
          })
        )}
      </g>
    );
  }


  if (element.type === 'time') {
    if (element.symbol === 'common') {
      return (
        <g transform={`translate(${x}, 0)`} data-testid="inline-time-common">
          <text x={12 * scale} y={centerY + 6 * scale} fontSize={`${Math.round(20 * scale)}px`} fontWeight="bold" fill="#0f172a" textAnchor="middle">
            C
          </text>
        </g>
      );
    }
    if (element.symbol === 'cut') {
      return (
        <g transform={`translate(${x}, 0)`} data-testid="inline-time-cut">
          <text x={12 * scale} y={centerY + 6 * scale} fontSize={`${Math.round(20 * scale)}px`} fontWeight="bold" fill="#0f172a" textAnchor="middle">
            ₵
          </text>
        </g>
      );
    }
    return (
      <g transform={`translate(${x}, 0)`} data-testid="inline-time">
        <text x={12 * scale} y={centerY - 3 * scale} fontSize={`${Math.round(14 * scale)}px`} fontWeight="bold" fill="#0f172a" textAnchor="middle">
          {element.numerator}
        </text>
        <text x={12 * scale} y={centerY + 13 * scale} fontSize={`${Math.round(14 * scale)}px`} fontWeight="bold" fill="#0f172a" textAnchor="middle">
          {element.denominator}
        </text>
      </g>
    );
  }

  if (element.type === 'dynamic') {
    const mark = element.mark;
    const glyphs: { path: string; dx: number }[] = [];
    const dynScale = scale * 0.85;

    if (mark === 'p') {
      glyphs.push({ path: MUSIC_GLYPHS.dynamicPiano, dx: 0 });
    } else if (mark === 'pp') {
      glyphs.push({ path: MUSIC_GLYPHS.dynamicPiano, dx: -3.5 });
      glyphs.push({ path: MUSIC_GLYPHS.dynamicPiano, dx: 3.5 });
    } else if (mark === 'ppp') {
      glyphs.push({ path: MUSIC_GLYPHS.dynamicPiano, dx: -7 });
      glyphs.push({ path: MUSIC_GLYPHS.dynamicPiano, dx: 0 });
      glyphs.push({ path: MUSIC_GLYPHS.dynamicPiano, dx: 7 });
    } else if (mark === 'f') {
      glyphs.push({ path: MUSIC_GLYPHS.dynamicForte, dx: 0 });
    } else if (mark === 'ff') {
      glyphs.push({ path: MUSIC_GLYPHS.dynamicForte, dx: -3.5 });
      glyphs.push({ path: MUSIC_GLYPHS.dynamicForte, dx: 3.5 });
    } else if (mark === 'fff') {
      glyphs.push({ path: MUSIC_GLYPHS.dynamicForte, dx: -7 });
      glyphs.push({ path: MUSIC_GLYPHS.dynamicForte, dx: 0 });
      glyphs.push({ path: MUSIC_GLYPHS.dynamicForte, dx: 7 });
    } else if (mark === 'mp') {
      glyphs.push({ path: MUSIC_GLYPHS.dynamicMezzo, dx: -5.5 });
      glyphs.push({ path: MUSIC_GLYPHS.dynamicPiano, dx: 5.0 });
    } else if (mark === 'mf') {
      glyphs.push({ path: MUSIC_GLYPHS.dynamicMezzo, dx: -5.0 });
      glyphs.push({ path: MUSIC_GLYPHS.dynamicForte, dx: 5.0 });
    } else if (mark === 'sfz') {
      glyphs.push({ path: MUSIC_GLYPHS.dynamicSforzando, dx: -7 });
      glyphs.push({ path: MUSIC_GLYPHS.dynamicForte, dx: -0.5 });
      glyphs.push({ path: MUSIC_GLYPHS.dynamicZ, dx: 6 });
    } else if (mark === 'fz') {
      glyphs.push({ path: MUSIC_GLYPHS.dynamicForte, dx: -3.5 });
      glyphs.push({ path: MUSIC_GLYPHS.dynamicZ, dx: 3.5 });
    }

    const naturalElemWidth = mark === 'p' || mark === 'f' ? 20 : mark === 'ppp' || mark === 'fff' || mark === 'sfz' ? 32 : 24;
    const elemWidth = (width ?? naturalElemWidth) * scale;
    const centerX = elemWidth / 2;
    const yPos = centerY + 26 * scale;

    return (
      <g
        transform={`translate(${x}, 0)`}
        data-testid={`dynamic-${mark}`}
        data-mark={mark}
      >
        {glyphs.map((g, i) => (
          <path
            key={i}
            d={g.path}
            transform={`translate(${centerX + g.dx * dynScale}, ${yPos}) scale(${dynScale})`}
            fill="#0f172a"
          />
        ))}
      </g>
    );
  }

  if (element.type === 'text') {
    if (element.category === 'part') {
      const badgeWidth = Math.max(32, element.text.length * 7.5 + 16);
      const fontSize = fonts?.chordsAndText
        ? `${(fonts.chordsAndText.sizePt ?? 11) * scale}pt`
        : 11 * scale;
      const fontFamily = fonts?.chordsAndText?.family || 'sans-serif';
      const fontWeight = fonts?.chordsAndText?.bold !== undefined
        ? (fonts.chordsAndText.bold ? 'bold' : 'normal')
        : 'bold';
      const fontStyle = fonts?.chordsAndText?.italic ? 'italic' : undefined;

      return (
        <g
          transform={x ? `translate(${x}, 0)` : undefined}
          data-testid="text-element"
          data-category="part"
          className="select-none"
        >
          <rect
            x={0}
            y={centerY - 46 * scale}
            width={badgeWidth}
            height={18 * scale}
            rx={3}
            ry={3}
            fill="#f8fafc"
            stroke={isSelected ? '#3b82f6' : '#475569'}
            strokeWidth={1.2}
          />
          <text
            x={badgeWidth / 2}
            y={centerY - 33 * scale}
            textAnchor="middle"
            fill={isSelected ? '#2563eb' : '#1e293b'}
            fontSize={fontSize}
            fontWeight={fontWeight}
            fontStyle={fontStyle}
            fontFamily={fontFamily}
          >
            {element.text}
          </text>
        </g>
      );
    }

    if (element.category === 'chord') {
      const fontSize = fonts?.chordsAndText
        ? `${(fonts.chordsAndText.sizePt ?? 12) * scale}pt`
        : 13 * scale;
      const fontFamily = fonts?.chordsAndText?.family || 'sans-serif';
      const fontWeight = fonts?.chordsAndText?.bold !== undefined
        ? (fonts.chordsAndText.bold ? 'bold' : 'normal')
        : 'bold';
      const fontStyle = fonts?.chordsAndText?.italic ? 'italic' : undefined;

      return (
        <g
          transform={x ? `translate(${x}, 0)` : undefined}
          data-testid="text-element"
          data-category="chord"
          className="select-none"
        >
          <text
            x={4}
            y={centerY - 28 * scale}
            fill={isSelected ? '#2563eb' : '#0f172a'}
            fontSize={fontSize}
            fontWeight={fontWeight}
            fontStyle={fontStyle}
            fontFamily={fontFamily}
          >
            {element.text}
          </text>
        </g>
      );
    }

    // Performance Note
    const textY = element.placement === 'below' ? centerY + 36 * scale : centerY - 16 * scale;
    const fontSize = fonts?.chordsAndText
      ? `${(fonts.chordsAndText.sizePt ?? 12) * scale}pt`
      : 12 * scale;
    const fontFamily = fonts?.chordsAndText?.family || 'serif';
    const fontStyle = fonts?.chordsAndText?.italic !== undefined
      ? (fonts.chordsAndText.italic ? 'italic' : 'normal')
      : 'italic';
    const fontWeight = fonts?.chordsAndText?.bold ? 'bold' : undefined;

    return (
      <g
        transform={x ? `translate(${x}, 0)` : undefined}
        data-testid="text-element"
        data-category="note"
        className="select-none"
      >
        <text
          x={2}
          y={textY}
          fill={isSelected ? '#2563eb' : '#334155'}
          fontSize={fontSize}
          fontStyle={fontStyle}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
        >
          {element.text}
        </text>
      </g>
    );
  }

  if (element.type === 'tempo') {
    const mode = element.displayMode || (element.text ? 'text-and-metronome' : 'metronome-only');
    const color = isSelected ? '#2563eb' : '#0f172a';
    const baseDuration = element.baseDuration || 4;
    const dotted = Boolean(element.dotted);
    const text = element.text || '';

    if (mode === 'text-only') {
      return (
        <g
          transform={x ? `translate(${x}, 0)` : undefined}
          data-testid="tempo-element"
          data-bpm={element.bpm}
          className="select-none"
        >
          <text
            x={4}
            y={centerY - 28}
            fill={color}
            fontSize={13}
            fontWeight="bold"
            fontFamily="serif"
          >
            {text}
          </text>
        </g>
      );
    }

    if (mode === 'metronome-only') {
      const glyphWidth = dotted ? (baseDuration >= 8 ? 16 : 14) : (baseDuration >= 8 ? 14 : 11);
      return (
        <g
          transform={x ? `translate(${x}, 0)` : undefined}
          data-testid="tempo-element"
          data-bpm={element.bpm}
          className="select-none"
        >
          <MetronomeGlyph
            x={2}
            centerY={centerY}
            baseDuration={baseDuration}
            dotted={dotted}
            color={color}
          />
          <text
            x={2 + glyphWidth + 2}
            y={centerY - 28}
            fill={color}
            fontSize={12}
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            = {element.bpm}
          </text>
        </g>
      );
    }

    // mode === 'text-and-metronome'
    const textW = Math.max(10, text.length * 7.5);
    const parenX = 4 + textW + 3;
    const glyphX = parenX + 7;
    const glyphWidth = dotted ? (baseDuration >= 8 ? 16 : 14) : (baseDuration >= 8 ? 14 : 11);
    const bpmX = glyphX + glyphWidth + 2;

    return (
      <g
        transform={x ? `translate(${x}, 0)` : undefined}
        data-testid="tempo-element"
        data-bpm={element.bpm}
        className="select-none"
      >
        <text
          x={4}
          y={centerY - 28}
          fill={color}
          fontSize={13}
          fontWeight="bold"
          fontFamily="serif"
        >
          {text}
        </text>
        <text
          x={parenX}
          y={centerY - 28}
          fill={color}
          fontSize={12}
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          (
        </text>
        <MetronomeGlyph
          x={glyphX}
          centerY={centerY}
          baseDuration={baseDuration}
          dotted={dotted}
          color={color}
        />
        <text
          x={bpmX}
          y={centerY - 28}
          fill={color}
          fontSize={12}
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          = {element.bpm})
        </text>
      </g>
    );
  }

  return null;
};

const MetronomeGlyph: React.FC<{
  baseDuration?: TempoBaseDuration;
  dotted?: boolean;
  color: string;
  x: number;
  centerY: number;
}> = ({
  baseDuration = 4,
  dotted = false,
  color,
  x,
  centerY,
}) => {
  const isHollow = baseDuration <= 2;
  const noteheadY = centerY - 32;
  const stemY1 = noteheadY;
  const stemY2 = noteheadY - 11;
  const stemX = x + 7;

  return (
    <g className="select-none pointer-events-none" data-testid="metronome-glyph">
      {/* Notehead */}
      <ellipse
        cx={x + 3.8}
        cy={noteheadY}
        rx={3.5}
        ry={2.5}
        transform={`rotate(-20, ${x + 3.8}, ${noteheadY})`}
        fill={isHollow ? 'none' : color}
        stroke={color}
        strokeWidth={isHollow ? 1.2 : 0}
      />
      {/* Stem */}
      <line
        x1={stemX}
        y1={stemY1}
        x2={stemX}
        y2={stemY2}
        stroke={color}
        strokeWidth="1.2"
      />
      {/* Flag for 8th or 16th */}
      {baseDuration >= 8 && (
        <path
          d={`M ${stemX} ${stemY2} C ${stemX + 3.5} ${stemY2 + 2}, ${stemX + 4.5} ${stemY2 + 5}, ${stemX + 5} ${stemY2 + 7}`}
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      )}
      {baseDuration >= 16 && (
        <path
          d={`M ${stemX} ${stemY2 + 3} C ${stemX + 3.5} ${stemY2 + 5}, ${stemX + 4.5} ${stemY2 + 8}, ${stemX + 5} ${stemY2 + 10}`}
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      )}
      {/* Augmentation dot */}
      {dotted && (
        <circle
          cx={stemX + (baseDuration >= 8 ? 6.5 : 4)}
          cy={noteheadY}
          r={1.3}
          fill={color}
        />
      )}
    </g>
  );
};

