/**
 * Support-console alerts: an audible chime plus an optional desktop
 * notification when a visitor sends a new message, so agents respond quickly.
 *
 * Everything here is best-effort — a suspended AudioContext, a denied
 * Notification permission, or the plain-HTTP internal deployment (where the
 * Notification API is unavailable but Web Audio still works) must never throw.
 */

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = audioCtx ?? new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Resume the audio context from inside a user gesture. Browsers hold it
 *  "suspended" until the page has been interacted with, so call this from a
 *  click/keydown handler to unlock chimes for the rest of the session. */
export function unlockChime(): void {
  const ctx = getCtx();
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
}

/** A short two-note "ding" synthesised on the fly — no audio asset to ship, so
 *  it also works offline and on the plain-HTTP internal deployment. */
export function playIncomingChime(): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const t0 = ctx.currentTime;
    // A5 then D6 — a friendly rising "ding-dong".
    for (const { f, at } of [{ f: 880, at: 0 }, { f: 1174.66, at: 0.13 }]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const start = t0 + at;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.28);
    }
  } catch {
    /* ignore */
  }
}

/** Ask once for desktop-notification permission. No-op if unsupported, already
 *  decided, or on an insecure context where the API isn't available. Must be
 *  called from a user gesture for the browser to actually show the prompt. */
export function requestNotifyPermission(): void {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') void Notification.requestPermission().catch(() => undefined);
  } catch {
    /* ignore */
  }
}

/** Show a desktop notification if the agent granted permission — most useful
 *  when the console tab is in the background. Clicking it focuses the window. */
export function notifyDesktop(title: string, body: string): void {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    // Same tag → a burst of messages replaces the toast instead of stacking.
    const n = new Notification(title, { body, tag: 'zemen-support' });
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* ignore */
  }
}
