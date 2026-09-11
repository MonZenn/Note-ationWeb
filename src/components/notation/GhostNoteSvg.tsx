import React from 'react';
import { calculatePitchY, calculateLedgerLines } from '../../engine/layout/geometry';

interface Props {
  x: number;
  centerY: number;
  diatonicOffset: number;
  scale?: number;
}

export const GhostNoteSvg: React.FC<Props> = ({ x, centerY, diatonicOffset, scale = 1.0 }) => {
  const y = calculatePitchY(centerY, diatonicOffset, scale);
  const ledgers = calculateLedgerLines(diatonicOffset);
  const noteheadCenterX = 7 * scale;

  return (
    <g transform={`translate(${x}, 0)`} className="pointer-events-none opacity-40">
      {ledgers.map((lStep) => (
        <line
          key={lStep}
          x1={noteheadCenterX - 11 * scale}
          y1={calculatePitchY(centerY, lStep, scale)}
          x2={noteheadCenterX + 11 * scale}
          y2={calculatePitchY(centerY, lStep, scale)}
          stroke="#2563eb"
          strokeWidth={1.4 * scale}
        />
      ))}
      <ellipse
        cx={noteheadCenterX}
        cy={y}
        rx={6.2 * scale}
        ry={4.2 * scale}
        transform={`rotate(-20, ${noteheadCenterX}, ${y})`}
        fill="#2563eb"
      />
    </g>
  );
};
