import {
  checkKey,
  hourTicks,
  minuteOfDay,
  minuteToAngle,
  sleepArc,
  slotArc,
  type ArcSpan,
  type CheckMap,
  type Occurrence,
  type Rhythm,
} from '@kairo/core';
import type { Block } from '@kairo/db';
import { status } from '@kairo/ui';
import type { ReactNode } from 'react';

/** Géométrie SVG du cadran (viewBox 340 × 340, centre 170). */
const C = 170;
const R = 128;

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function arcPath([a0, a1]: ArcSpan): string {
  const [x0, y0] = polar(R, a0);
  const [x1, y1] = polar(R, a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export interface DialProps {
  occurrences: readonly Occurrence<Block>[];
  current: Occurrence<Block> | null;
  checks: CheckMap;
  rhythm: Rhythm;
  now: Date;
  colorOf: (b: Block) => string;
  /** Contenu du centre (bouton). */
  children: ReactNode;
}

/** Cadran 24 h de l'écran Aujourd'hui : sommeil, créneaux du jour, point « maintenant ». */
export function Dial({ occurrences, current, checks, rhythm, now, colorOf, children }: DialProps) {
  const nowMin = minuteOfDay(now) + now.getSeconds() / 60;
  const [nx, ny] = polar(R, minuteToAngle(nowMin));
  return (
    <div className="relative size-80 self-center">
      <svg
        width="320"
        height="320"
        viewBox="0 0 340 340"
        aria-hidden="true"
        className="absolute inset-0 overflow-visible"
      >
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--k-track)" strokeWidth="26" />
        {hourTicks().map(({ hour, angle, major }) => {
          const [x1, y1] = polar(146, angle);
          const [x2, y2] = polar(major ? 156 : 151, angle);
          return (
            <line
              key={hour}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--k-ink3)"
              opacity={major ? 0.9 : 0.35}
              strokeWidth={major ? 2 : 1.2}
              strokeLinecap="round"
            />
          );
        })}
        {[0, 6, 12, 18].map((h) => {
          const [x, y] = polar(170, h * 15);
          return (
            <text
              key={h}
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize="10"
              fill="var(--k-ink3)"
              className="font-mono"
            >
              {String(h).padStart(2, '0')}
            </text>
          );
        })}
        {sleepArc(rhythm).map((span) => (
          <path
            key={`sleep-${span[0]}`}
            d={arcPath(span)}
            fill="none"
            stroke={status.sleep}
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.6"
          />
        ))}
        {occurrences.flatMap((o) => {
          const color = colorOf(o.slot);
          const isCur = current?.slot.id === o.slot.id && current.day === o.day;
          const st = checks[checkKey(o.day, o.slot.id)];
          const past = o.end <= now;
          return slotArc(o.startMin, o.durationMin).map((span) => (
            <path
              key={`${o.slot.id}-${span[0]}`}
              d={arcPath(span)}
              fill="none"
              stroke={color}
              strokeWidth={isCur ? 30 : 22}
              strokeLinecap="round"
              opacity={st === 'missed' ? 0.2 : past ? 0.45 : 1}
              style={{ filter: isCur ? `drop-shadow(0 0 10px ${color})` : 'none' }}
            />
          ));
        })}
        <circle
          cx={nx}
          cy={ny}
          r="7"
          fill="var(--k-ink)"
          style={{ filter: 'drop-shadow(0 0 8px var(--k-ink))' }}
        />
        <circle cx={nx} cy={ny} r="3" fill="var(--k-bg)" />
      </svg>
      {children}
    </div>
  );
}
