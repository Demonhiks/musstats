import { useEffect, useId, useRef } from 'react';
import type { DayPoint } from '../types';
import { weekdayIndex } from '../lib/stats';

/** Сглаженный путь по точкам (без резких углов на редких всплесках). */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    const midX = (prev.x + cur.x) / 2;
    d += ` C ${midX} ${prev.y}, ${midX} ${cur.y}, ${cur.x} ${cur.y}`;
  }
  return d;
}

/** Прореживает длинный ряд, складывая соседние значения (для годовых диапазонов). */
export function bucket(values: number[], target = 60): number[] {
  if (values.length <= target) return values;
  const size = Math.ceil(values.length / target);
  const result: number[] = [];
  for (let i = 0; i < values.length; i += size) {
    const slice = values.slice(i, i + size);
    result.push(slice.reduce((sum, value) => sum + value, 0));
  }
  return result;
}

export function AreaChart({
  values,
  height = 132,
  label,
}: {
  values: number[];
  height?: number;
  label?: string;
}) {
  const gradientId = useId().replace(/:/g, '');
  const width = 320;
  const padding = 6;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  const points = values.map((value, index) => ({
    x: padding + index * step,
    y: height - padding - (value / max) * (height - padding * 2),
  }));

  const line = smoothPath(points);
  const area = points.length
    ? `${line} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
    : '';
  const last = points[points.length - 1];

  return (
    <svg
      className="area"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label ?? 'График прослушиваний'}
    >
      <defs>
        <linearGradient id={`area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD84D" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#FFD84D" stopOpacity="0" />
        </linearGradient>
      </defs>
      {area ? <path d={area} fill={`url(#area-${gradientId})`} /> : null}
      {line ? <path d={line} fill="none" stroke="#FFD84D" strokeWidth="2" strokeLinecap="round" /> : null}
      {last ? <circle cx={last.x} cy={last.y} r="3.4" fill="#0B0B0F" stroke="#FFD84D" strokeWidth="2" /> : null}
    </svg>
  );
}

export function Bars({
  values,
  labels,
  highlight,
  formatValue,
}: {
  values: number[];
  labels?: string[];
  highlight?: number;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...values);
  return (
    <div className="bars">
      {values.map((value, index) => {
        const active = highlight === index;
        return (
          <div className="bars__col" key={index} title={`${labels?.[index] ?? index}: ${formatValue ? formatValue(value) : value}`}>
            <div className={`bars__track ${active ? 'is-active' : ''}`}>
              <div className="bars__bar" style={{ height: `${Math.max(3, (value / max) * 100)}%` }} />
            </div>
            {labels ? <span className="bars__label">{labels[index]}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

const LEVELS = ['#1B1B24', '#3D3313', '#6C5A12', '#B08C1B', '#FFD84D'];

export function Heatmap({ days }: { days: DayPoint[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [days]);

  if (days.length === 0) return null;

  const max = Math.max(1, ...days.map((day) => day.plays));
  const byKey = new Map(days.map((day) => [day.day, day.plays]));

  const first = new Date(days[0].ts);
  const start = new Date(first);
  start.setDate(start.getDate() - weekdayIndex(first.getTime()));

  const last = new Date(days[days.length - 1].ts);
  const totalWeeks = Math.floor((last.getTime() - start.getTime()) / 86_400_000 / 7) + 1;

  // Клетка подбирается так, чтобы короткие периоды не растягивались на всю карточку,
  // а длинные — уезжали в горизонтальный скролл (как на GitHub).
  const compact = totalWeeks > 60;
  const cell = compact ? 6 : Math.min(34, Math.max(3, Math.floor(376 / totalWeeks) - 3));
  const gap = compact ? 2 : Math.max(2, Math.round(cell * 0.3));
  const width = totalWeeks * (cell + gap);
  const height = 7 * (cell + gap);
  const radius = Math.max(2, cell * 0.24);
  const labelSize = cell >= 12 ? 10 : 8;

  const months: { x: number; label: string }[] = [];
  let lastMonth = -1;
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  const cells = [];
  for (let week = 0; week < totalWeeks; week += 1) {
    for (let row = 0; row < 7; row += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + row);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;
      const plays = byKey.get(key) ?? 0;
      const level = plays === 0 ? 0 : Math.min(4, 1 + Math.floor((plays / max) * 3.999));
      if (row === 0 && date.getMonth() !== lastMonth) {
        lastMonth = date.getMonth();
        months.push({ x: week * (cell + gap), label: MONTHS[date.getMonth()] });
      }
      cells.push(
        <rect
          key={`${week}-${row}`}
          x={week * (cell + gap)}
          y={row * (cell + gap)}
          width={cell}
          height={cell}
          rx={radius}
          fill={LEVELS[level]}
        >
          <title>{`${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} — ${plays} прослушиваний`}</title>
        </rect>,
      );
    }
  }

  return (
    <div className="heatmap" ref={scroller}>
      <svg
        width={width}
        height={height + labelSize + 8}
        viewBox={`0 -${labelSize + 6} ${width} ${height + labelSize + 8}`}
        role="img"
        aria-label="Календарь активности"
      >
        {months.map((month) => (
          <text
            key={`${month.x}-${month.label}`}
            x={month.x}
            y={-3}
            className="heatmap__month"
            fontSize={labelSize}
          >
            {month.label}
          </text>
        ))}
        {cells}
      </svg>
    </div>
  );
}
