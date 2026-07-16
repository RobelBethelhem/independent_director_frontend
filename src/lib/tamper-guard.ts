import { API_BASE } from './api';

/**
 * Client-side inspection DETERRENT — production build only.
 *
 * IMPORTANT (and by design honest): this cannot actually prevent a determined
 * person from inspecting the page. It blocks the common shortcuts (F12, right-
 * click → Inspect, Ctrl/Cmd+Shift+I/J/C, view-source) and reports repeated
 * attempts to the server, which auto-blocklists the source IP after a few tries.
 * Someone who disables JavaScript, opens DevTools from the browser menu, reads
 * the served JS bundle, or uses a proxy/curl bypasses all of this — the real
 * protection is the server's authorization checks. Treat this as friction +
 * an early-warning signal, not a security boundary.
 */

let strikes = 0;
let lastReportAt = 0;
let banner: HTMLDivElement | null = null;

function report(kind: string): void {
  const now = Date.now();
  // Ignore bursts (held keys) so a single deliberate attempt = one strike.
  if (now - lastReportAt < 500) return;
  lastReportAt = now;
  try {
    void fetch(`${API_BASE}/security/report-tamper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* never let reporting throw */
  }
}

function showBanner(): void {
  const message =
    strikes <= 1
      ? 'Inspecting this page is not permitted.'
      : strikes === 2
        ? 'Warning: another attempt will restrict access from your network.'
        : 'Access from your network is being restricted due to repeated inspection attempts.';
  if (!banner) {
    banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'right:0',
      'z-index:2147483647',
      'padding:12px 16px',
      'text-align:center',
      'font:600 13px/1.4 system-ui,sans-serif',
      'color:#fff',
      'background:#b91c1c',
      'box-shadow:0 2px 8px rgba(0,0,0,.25)',
    ].join(';');
    document.body.appendChild(banner);
  }
  banner.textContent = message;
  banner.style.display = 'block';
  window.clearTimeout((banner as unknown as { _t?: number })._t);
  (banner as unknown as { _t?: number })._t = window.setTimeout(() => {
    if (banner && strikes < 3) banner.style.display = 'none';
  }, 4000);
}

function strike(kind: string): void {
  strikes += 1;
  report(kind);
  showBanner();
}

function isBlockedShortcut(e: KeyboardEvent): boolean {
  if (e.repeat) return false;
  const k = e.key.toLowerCase();
  // F12
  if (e.key === 'F12') return true;
  // Ctrl/Cmd + Shift + I | J | C  (DevTools / console / element picker)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) return true;
  // Ctrl/Cmd + U  (view source) — but keep Cmd+U etc. only when not typing
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && k === 'u') return true;
  // macOS DevTools: Cmd + Alt + I | J | C
  if (e.metaKey && e.altKey && ['i', 'j', 'c'].includes(k)) return true;
  return false;
}

/** Call once at startup. No-op outside a production build so local dev + our own
 *  debugging keep full DevTools access. */
export function installTamperGuard(): void {
  if (!import.meta.env.PROD) return;
  try {
    window.addEventListener(
      'contextmenu',
      (e) => {
        e.preventDefault();
        strike('contextmenu');
      },
      { capture: true },
    );
    window.addEventListener(
      'keydown',
      (e) => {
        if (isBlockedShortcut(e)) {
          e.preventDefault();
          e.stopPropagation();
          strike(e.key === 'F12' ? 'devtools-f12' : 'devtools-shortcut');
        }
      },
      { capture: true },
    );
  } catch {
    /* deterrent must never break the app */
  }
}
