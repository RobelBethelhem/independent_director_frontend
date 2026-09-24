import { useEffect, useState } from 'react';
import { CalendarClock, Lock, Send, TriangleAlert, Unlock } from 'lucide-react';
import { adminApi, type PendingNotification } from '../../lib/admin-api';
import { Field, Input, Modal } from '../../components/ui';
import { HttpError } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';
import { BulkNotifyModal } from './BulkNotifyModal';

interface CycleInfo {
  id: string;
  title: string;
  submissionCloseAt: string;
  reviewCloseAt: string | null;
  interviewStartAt: string | null;
  interviewEndAt: string | null;
  interviewScoringOpen: boolean;
  acceptingApplications: boolean;
  reviewActive: boolean;
  statusLocked: boolean;
}

/** ISO string <-> <input type="datetime-local"> value, in the browser's local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReviewSettingsModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [cycle, setCycle] = useState<CycleInfo | null>(null);
  const [submissionCloseAt, setSubmissionCloseAt] = useState('');
  const [reviewCloseAt, setReviewCloseAt] = useState('');
  const [ivStart, setIvStart] = useState('');
  const [ivEnd, setIvEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<PendingNotification[] | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);

  async function load() {
    const [c, p] = await Promise.all([adminApi.cycle(), adminApi.pendingNotifications()]);
    setCycle(c);
    setSubmissionCloseAt(toLocalInput(c.submissionCloseAt));
    setReviewCloseAt(toLocalInput(c.reviewCloseAt));
    setIvStart(toLocalInput(c.interviewStartAt));
    setIvEnd(toLocalInput(c.interviewEndAt));
    setPending(p);
  }
  useEffect(() => {
    void load();
  }, []);

  const bothSet = !!submissionCloseAt && !!reviewCloseAt;
  const orderOk = !bothSet || new Date(reviewCloseAt).getTime() > new Date(submissionCloseAt).getTime();
  // Interview period is optional until the admin is ready, but both ends go together.
  const ivPair = (!ivStart && !ivEnd) || (!!ivStart && !!ivEnd);
  const ivOrderOk = !ivStart || !ivEnd || new Date(ivEnd).getTime() > new Date(ivStart).getTime();
  const ivAfterClose = !ivStart || !submissionCloseAt || new Date(ivStart).getTime() > new Date(submissionCloseAt).getTime();
  const canSave = bothSet && orderOk && ivPair && ivOrderOk && ivAfterClose;

  async function save() {
    if (!cycle || !canSave) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await adminApi.updateCycleSettings(cycle.id, {
        submissionCloseAt: new Date(submissionCloseAt).toISOString(),
        reviewCloseAt: new Date(reviewCloseAt).toISOString(),
        ...(ivStart && ivEnd
          ? { interviewStartAt: new Date(ivStart).toISOString(), interviewEndAt: new Date(ivEnd).toISOString() }
          : {}),
      });
      await load();
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal title="Review window & notifications" width={640} onClose={onClose}>
        {!cycle ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
              Window &amp; deadlines
            </div>

            <div className="indep-banner info" style={{ alignItems: 'flex-start', marginBottom: 18 }}>
              <CalendarClock size={18} style={{ flex: '0 0 auto', marginTop: 1 }} />
              <div style={{ fontSize: 13 }}>
                {cycle.acceptingApplications ? (
                  <>
                    Applications are still open until <b>{fmtDateTime(cycle.submissionCloseAt)}</b> — reviewers
                    can’t score yet, and status changes are locked, until then.
                  </>
                ) : cycle.statusLocked ? (
                  <>
                    Applications closed — review is <b>active</b>. Reviewers can score now; application status
                    changes stay locked until <b>{fmtDateTime(cycle.reviewCloseAt)}</b>. Extend the date below if
                    reviewers need more time.
                  </>
                ) : (
                  <>
                    Review period ended {fmtDateTime(cycle.reviewCloseAt)} — status changes are unlocked, reviewers
                    can no longer score. Set a later date below to reopen review.
                  </>
                )}
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 8 }}>
              <Field label="Applications close" required hint="Reviewers gain access automatically once this passes">
                <Input type="datetime-local" value={submissionCloseAt} onChange={(e) => setSubmissionCloseAt(e.target.value)} />
              </Field>
              <Field label="Document review closes" required hint="Stage 1 · Document Evaluation (50%) deadline">
                <Input type="datetime-local" value={reviewCloseAt} onChange={(e) => setReviewCloseAt(e.target.value)} />
              </Field>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, margin: '14px 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              Interview time frame
              {cycle.interviewScoringOpen && (
                <span className="badge badge-short" style={{ fontSize: 10.5 }}>Interview scoring open</span>
              )}
            </div>
            <div className="grid-2" style={{ marginBottom: 8 }}>
              <Field label="Interview period starts" hint="Shown in the invitation SMS draft">
                <Input type="datetime-local" value={ivStart} onChange={(e) => setIvStart(e.target.value)} />
              </Field>
              <Field label="Interview period ends" hint="Reviewers can then score the Interview (50%) and final-submit">
                <Input type="datetime-local" value={ivEnd} onChange={(e) => setIvEnd(e.target.value)} />
              </Field>
            </div>
            {!ivPair && (
              <div className="indep-banner flag" style={{ marginBottom: 12, alignItems: 'center' }}>
                <TriangleAlert size={16} />
                <span>Set both the interview start and end.</span>
              </div>
            )}
            {ivPair && !ivOrderOk && (
              <div className="indep-banner flag" style={{ marginBottom: 12, alignItems: 'center' }}>
                <TriangleAlert size={16} />
                <span>The interview end must be after its start.</span>
              </div>
            )}
            {ivPair && ivOrderOk && !ivAfterClose && (
              <div className="indep-banner flag" style={{ marginBottom: 12, alignItems: 'center' }}>
                <TriangleAlert size={16} />
                <span>The interview period must start after applications close.</span>
              </div>
            )}
            {bothSet && !orderOk && (
              <div className="indep-banner flag" style={{ marginBottom: 12, alignItems: 'center' }}>
                <TriangleAlert size={16} />
                <span>The review-close date must be after the applications-close date.</span>
              </div>
            )}

            {error && <div className="errmsg" style={{ marginBottom: 10 }}>{error}</div>}
            {saved && !error && (
              <div className="indep-banner clear" style={{ marginBottom: 10, padding: '8px 12px', fontSize: 12.5 }}>
                Saved.
              </div>
            )}

            <div style={{ marginBottom: 26 }}>
              <button className="btn btn-primary" disabled={saving || !canSave} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save dates'}
              </button>
            </div>

            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                marginBottom: 12,
                paddingTop: 18,
                borderTop: '1px solid var(--line)',
              }}
            >
              Status-change notifications
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 14 }}>
              Status changes don’t email or text applicants immediately — they queue up here, so you can make a
              whole batch of decisions and notify everyone at once.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                {pending === null ? (
                  'Loading…'
                ) : (
                  <>
                    {pending.length === 0 ? <Lock size={15} color="var(--ink-3)" /> : <Unlock size={15} color="var(--brand)" />}
                    <b>{pending.length}</b> applicant{pending.length === 1 ? '' : 's'} waiting to be notified
                  </>
                )}
              </div>
              <div style={{ flex: 1 }} />
              <button className="btn btn-dark" disabled={!pending || pending.length === 0} onClick={() => setNotifyOpen(true)}>
                <Send size={16} /> Send bulk notifications
              </button>
            </div>
          </>
        )}
      </Modal>
      {notifyOpen && pending && (
        <BulkNotifyModal
          pending={pending}
          onClose={() => setNotifyOpen(false)}
          onDone={() => {
            setNotifyOpen(false);
            void load();
          }}
        />
      )}
    </>
  );
}
