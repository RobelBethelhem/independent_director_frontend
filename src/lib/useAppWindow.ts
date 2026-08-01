import { useEffect, useState } from 'react';
import { recruitmentApi, type AppWindow } from './recruitment-api';

/**
 * Applications open Aug 3, 2026, 12:00 AM (Addis Ababa / EAT). The backend
 * tracks only the close date (admin-managed); the open date is a fixed default.
 */
export const APP_OPENS_AT = new Date('2026-08-03T00:00:00+03:00').getTime();

export type WindowPhase = 'before' | 'open' | 'closed';

/** Absolute instant → the viewer's local date-time. */
export function fmtWhen(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Short date, e.g. "Aug 3, 2026". */
export function fmtDay(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtCountdown(ms: number): string {
  const total = Math.max(0, ms);
  const d = Math.floor(total / 86_400_000);
  const h = Math.floor((total % 86_400_000) / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export interface AppWindowState {
  win: AppWindow | null;
  phase: WindowPhase;
  opensAt: number;
  closesAt: number | null;
  remainingToOpen: number | null;
  remainingToClose: number | null;
  /** True only while the window is open — used to gate the register button. */
  canApply: boolean;
}

/** Live application-window state (open date fixed, close date from the backend),
 *  re-evaluated every second so callers can show a ticking countdown. */
export function useAppWindow(): AppWindowState {
  const [win, setWin] = useState<AppWindow | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    recruitmentApi.window().then(setWin).catch(() => undefined);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const opensAt = APP_OPENS_AT;
  const closesAt = win ? new Date(win.submissionCloseAt).getTime() : null;
  const beforeOpen = now < opensAt;
  const afterClose = closesAt !== null && now > closesAt;
  const phase: WindowPhase = beforeOpen ? 'before' : afterClose ? 'closed' : 'open';

  return {
    win,
    phase,
    opensAt,
    closesAt,
    remainingToOpen: beforeOpen ? opensAt - now : null,
    remainingToClose: phase === 'open' && closesAt !== null ? closesAt - now : null,
    canApply: phase === 'open',
  };
}
