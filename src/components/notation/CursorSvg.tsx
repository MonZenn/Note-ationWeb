import React from 'react';
import { STAFF_HEIGHT } from '../../engine/layout/geometry';

interface Props {
  x: number;
  centerY: number;
  scale?: number;
}

export const CursorSvg: React.FC<Props> = ({ x, centerY, scale = 1.0 }) => {
  const topY = centerY - (STAFF_HEIGHT / 2) * scale - 8 * scale;
  const bottomY = centerY + (STAFF_HEIGHT / 2) * scale + 8 * scale;
  return (
    <g transform={`translate(${x}, 0)`} className="pointer-events-none animate-pulse">
      <line x1={0} y1={topY} x2={0} y2={bottomY} stroke="#2563eb" strokeWidth={2.5 * scale} strokeDasharray="3 2" />
    </g>
  );
};
