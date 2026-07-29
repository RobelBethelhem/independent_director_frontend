import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, MousePointer2, X } from 'lucide-react';

export interface TourStep {
  /** CSS selector for the element to spotlight; omit for a centered welcome/finish card. */
  selector?: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Pick the first on-screen match (handles responsive duplicates, e.g. the
 *  desktop rail vs. the mobile stepper sharing a data-tour attribute). */
function firstVisible(selector: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  const shown = els.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && el.offsetParent !== null;
  });
  return shown ?? els[0] ?? null;
}

function boxOf(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function sameBox(a: Box | null, b: Box | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

/**
 * A polished, self-contained product tour. Spotlights each target with a dimmed
 * cut-out, glides an animated pointer to it, and shows a callout explaining the
 * step. Pure overlay — it never reads or mutates the underlying form.
 */
export function OnboardingTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [calloutSize, setCalloutSize] = useState({ w: 344, h: 220 });
  const calloutRef = useRef<HTMLDivElement | null>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  const next = () => (last ? onClose() : setI((v) => Math.min(steps.length - 1, v + 1)));
  const prev = () => setI((v) => Math.max(0, v - 1));

  // Resolve + follow the target (survives scroll/resize) without re-rendering
  // unless its geometry actually changes.
  useEffect(() => {
    let raf = 0;
    let prevBox: Box | null = null;
    let el = step.selector ? firstVisible(step.selector) : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const tick = () => {
      if (step.selector && (!el || !document.body.contains(el))) el = firstVisible(step.selector);
      const b = el && step.selector ? boxOf(el) : null;
      if (!sameBox(prevBox, b)) {
        prevBox = b;
        setBox(b);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, step.selector]);

  // Measure the callout so it can be placed precisely.
  useLayoutEffect(() => {
    const el = calloutRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCalloutSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: r.width, h: r.height }));
  }, [i, box]);

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Place the callout relative to the target, flipping/clamping to stay on-screen.
  const pad = 16;
  const gap = 18;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  let placement = step.placement ?? 'bottom';
  let cLeft: number;
  let cTop: number;
  if (!box) {
    cLeft = (vw - calloutSize.w) / 2;
    cTop = (vh - calloutSize.h) / 2;
  } else {
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    if (placement === 'right' && box.left + box.width + gap + calloutSize.w > vw - pad) placement = 'left';
    if (placement === 'left' && box.left - gap - calloutSize.w < pad) placement = 'right';
    if (placement === 'top' && box.top - gap - calloutSize.h < pad) placement = 'bottom';
    if (placement === 'bottom' && box.top + box.height + gap + calloutSize.h > vh - pad) placement = 'top';
    switch (placement) {
      case 'right':
        cLeft = box.left + box.width + gap;
        cTop = cy - calloutSize.h / 2;
        break;
      case 'left':
        cLeft = box.left - gap - calloutSize.w;
        cTop = cy - calloutSize.h / 2;
        break;
      case 'top':
        cLeft = cx - calloutSize.w / 2;
        cTop = box.top - gap - calloutSize.h;
        break;
      default:
        cLeft = cx - calloutSize.w / 2;
        cTop = box.top + box.height + gap;
        break;
    }
  }
  cLeft = Math.max(pad, Math.min(cLeft, vw - calloutSize.w - pad));
  cTop = Math.max(pad, Math.min(cTop, vh - calloutSize.h - pad));

  const spotPad = 8;

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="Getting started">
      {/* Blocks interaction with the form during the tour (and dims for centered cards). */}
      <div className="tour-catch" style={box ? undefined : { background: 'rgba(20,18,16,.62)' }} />

      {box && (
        <div
          className="tour-spot"
          style={{
            top: box.top - spotPad,
            left: box.left - spotPad,
            width: box.width + spotPad * 2,
            height: box.height + spotPad * 2,
          }}
        />
      )}

      {box && (
        <div
          className="tour-pointer"
          style={{
            top: Math.max(8, Math.min(box.top + box.height - 4, vh - 34)),
            left: Math.max(8, Math.min(box.left + box.width - 4, vw - 34)),
          }}
          aria-hidden
        >
          <MousePointer2 size={26} strokeWidth={2.4} />
        </div>
      )}

      <div ref={calloutRef} className={`tour-callout${box ? '' : ' centered'}`} style={{ top: cTop, left: cLeft }}>
        <button className="tour-x" onClick={onClose} aria-label="Close tour" type="button">
          <X size={16} />
        </button>
        <div className="tour-step-n">Step {i + 1} of {steps.length}</div>
        <h3 className="tour-title serif">{step.title}</h3>
        <p className="tour-body">{step.body}</p>
        <div className="tour-dots" aria-hidden>
          {steps.map((_, k) => (
            <span key={k} className={k === i ? 'on' : ''} />
          ))}
        </div>
        <div className="tour-actions">
          <button className="btn btn-link tour-skip" onClick={onClose} type="button">
            {last ? 'Close' : 'Skip tour'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={prev} type="button">
                <ArrowLeft size={15} /> Back
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={next} type="button">
              {last ? (
                'Get started'
              ) : (
                <>
                  Next <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
