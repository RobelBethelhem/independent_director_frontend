import type { ReactNode } from 'react';

/** Brand-aligned categorical palette. */
export const PALETTE = [
  '#ED1D24', '#2B6CB0', '#1E7F4F', '#B8860B', '#5A4FCF',
  '#C2410C', '#0F766E', '#7E0E12', '#8a827a', '#9333EA',
];

export function ChartCard({
  title,
  subtitle,
  right,
  children,
  span = 1,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  span?: number;
}) {
  return (
    <div className="card chart-card" style={{ gridColumn: `span ${span}` }}>
      <div className="chart-head">
        <div>
          <div className="chart-title">{title}</div>
          {subtitle && <div className="chart-sub">{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

interface Datum {
  label: string;
  value: number;
}

/** Horizontal bar list — ranked categories. */
export function BarList({
  data,
  color = 'var(--brand)',
  unit = '',
  max,
}: {
  data: Datum[];
  color?: string | ((d: Datum, i: number) => string);
  unit?: string;
  max?: number;
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <div className="muted" style={{ fontSize: 13 }}>No data.</div>;
  return (
    <div className="barlist">
      {data.map((d, i) => (
        <div className="barrow" key={d.label}>
          <div className="barlabel" title={d.label}>{d.label}</div>
          <div className="bartrack">
            <div
              className="barfill"
              style={{ width: `${(d.value / top) * 100}%`, background: typeof color === 'function' ? color(d, i) : color }}
            />
          </div>
          <div className="barval">{d.value}{unit}</div>
        </div>
      ))}
    </div>
  );
}

/** Vertical bars — good for a time series / ordered buckets. */
export function VBars({ data, color = 'var(--brand)' }: { data: Datum[]; color?: string }) {
  const top = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <div className="muted" style={{ fontSize: 13 }}>No data.</div>;
  return (
    <div className="vbars">
      {data.map((d) => (
        <div className="vbar" key={d.label} title={`${d.label}: ${d.value}`}>
          <div className="vbar-col">
            <div className="vbar-fill" style={{ height: `${(d.value / top) * 100}%`, background: color }}>
              <span className="vbar-num">{d.value}</span>
            </div>
          </div>
          <div className="vbar-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

interface Segment {
  label: string;
  value: number;
  color: string;
}

/** SVG donut with legend. */
export function Donut({ segments, size = 132, thickness = 20 }: { segments: Segment[]; size?: number; thickness?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flex: '0 0 auto' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((s) => {
            const len = (s.value / total) * circ;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-acc}
              />
            );
            acc += len;
            return el;
          })}
      </svg>
      <div style={{ display: 'grid', gap: 6, minWidth: 120 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flex: '0 0 auto' }} />
            <span style={{ flex: 1, color: 'var(--ink-2)' }}>{s.label}</span>
            <b>{s.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Conversion funnel — decreasing horizontal bars with stage-to-stage %. */
export function Funnel({ stages }: { stages: { key: string; count: number }[] }) {
  const top = Math.max(1, stages[0]?.count ?? 1);
  return (
    <div className="funnel">
      {stages.map((s, i) => {
        const conv = i > 0 && stages[i - 1].count ? Math.round((s.count / stages[i - 1].count) * 100) : null;
        return (
          <div className="funnel-row" key={s.key}>
            <div className="funnel-label">{s.key}</div>
            <div className="funnel-track">
              <div className="funnel-fill" style={{ width: `${(s.count / top) * 100}%`, background: PALETTE[i % PALETTE.length] }}>
                <span>{s.count}</span>
              </div>
            </div>
            <div className="funnel-conv">{conv != null ? `${conv}%` : '—'}</div>
          </div>
        );
      })}
    </div>
  );
}
