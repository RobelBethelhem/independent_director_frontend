/** dd Mon yyyy, matching the prototype's fmtDate. */
export function fmtDate(d?: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** dd Mon yyyy, HH:mm:ss — for the audit trail. */
export function fmtDateTime(d?: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** "YYYY-MM" → "Mon YYYY" (e.g. 2018-03 → Mar 2018). */
export function fmtMonth(m?: string | null): string {
  if (!m) return '';
  const [y, mo] = m.split('-');
  if (!y) return '';
  return new Date(Number(y), (Number(mo) || 1) - 1, 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });
}

/** A board/role period from structured fields (falls back to legacy free text). */
export function fmtPeriod(b: { fromMonth?: string | null; toMonth?: string | null; isCurrent?: boolean | null; period?: string | null }): string {
  if (b.isCurrent && b.fromMonth) return `${fmtMonth(b.fromMonth)} – present`;
  if (b.fromMonth || b.toMonth) return `${fmtMonth(b.fromMonth)} – ${fmtMonth(b.toMonth)}`.trim();
  return b.period ?? '';
}

export function fmtBytes(bytes: number | string): string {
  const n = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (!Number.isFinite(n)) return '';
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
