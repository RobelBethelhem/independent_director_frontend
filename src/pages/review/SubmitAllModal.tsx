import { useState } from 'react';
import { ArrowRight, CheckCircle2, Send, TriangleAlert } from 'lucide-react';
import { reviewApi, type ReviewCandidate } from '../../lib/review-api';
import { Modal, Input } from '../../components/ui';
import { CRITERIA } from '../../lib/constants';
import { HttpError } from '../../lib/api';

const fullName = (c: ReviewCandidate) =>
  [c.title, c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ') || c.reference || 'Candidate';

/**
 * Bulk-submit the reviewer's in-progress (draft) assessments. Two steps:
 * 1) summary — checks completeness and hints which aren't fully evaluated;
 * 2) declaration — requires typing "submit all" to confirm. Only fully-scored
 *    drafts are submitted; incomplete ones stay as drafts.
 */
export function SubmitAllModal({
  drafts,
  onClose,
  onDone,
}: {
  drafts: ReviewCandidate[];
  onClose: () => void;
  onDone: () => void;
}) {
  const total = CRITERIA.length;
  const ready = drafts.filter((d) => d.myScoredCount >= total);
  const incomplete = drafts.filter((d) => d.myScoredCount < total);

  const [phase, setPhase] = useState<'summary' | 'confirm'>('summary');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ submitted: number; skipped: number } | null>(null);
  const canConfirm = typed.trim().toLowerCase() === 'submit all';

  async function doSubmit() {
    setBusy(true);
    setError(null);
    try {
      const res = await reviewApi.submitAll();
      setResult({ submitted: res.submitted, skipped: res.skipped.length });
      onDone();
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Could not submit. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Modal
        title="Submission complete"
        width={520}
        onClose={onClose}
        footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}
      >
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <CheckCircle2 size={42} color="var(--ok)" />
          <h3 style={{ marginTop: 12, marginBottom: 6 }}>
            {result.submitted} assessment{result.submitted === 1 ? '' : 's'} submitted
          </h3>
          {result.skipped > 0 && (
            <p className="muted" style={{ fontSize: 13.5 }}>
              {result.skipped} left in progress — finish scoring them to submit.
            </p>
          )}
        </div>
      </Modal>
    );
  }

  if (phase === 'summary') {
    return (
      <Modal
        title="Submit all in-progress reviews"
        width={580}
        onClose={onClose}
        footer={
          <>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={ready.length === 0} onClick={() => setPhase('confirm')}>
              GO — review {ready.length} <ArrowRight size={16} />
            </button>
          </>
        }
      >
        <p style={{ marginTop: 0, fontSize: 14 }}>
          You have <b>{drafts.length}</b> assessment{drafts.length === 1 ? '' : 's'} in progress.
        </p>
        <div className="indep-banner clear" style={{ alignItems: 'center' }}>
          <CheckCircle2 size={18} />
          <span><b>{ready.length}</b> fully evaluated and ready to submit.</span>
        </div>
        {incomplete.length > 0 && (
          <div className="indep-banner flag" style={{ display: 'block', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TriangleAlert size={16} /> {incomplete.length} not fully evaluated
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 8 }}>
              Complete the scoring for these first, or proceed to submit only the {ready.length} ready ones:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontWeight: 500, lineHeight: 1.7 }}>
              {incomplete.map((d) => (
                <li key={d.id}>
                  {fullName(d)} — <b>{d.myScoredCount} of {total}</b> criteria scored
                </li>
              ))}
            </ul>
          </div>
        )}
        {ready.length === 0 && (
          <p className="muted" style={{ fontSize: 13.5 }}>
            None of your drafts are fully scored yet — finish scoring at least one to submit.
          </p>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      title="Reviewer Declaration"
      width={580}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => setPhase('summary')} disabled={busy}>Back</button>
          <button className="btn btn-primary" disabled={!canConfirm || busy} onClick={() => void doSubmit()}>
            <Send size={16} /> {busy ? 'Submitting…' : `Submit all (${ready.length})`}
          </button>
        </>
      }
    >
      <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>
        <p style={{ marginTop: 0 }}>
          I, the undersigned, hereby declare that I have reviewed the <b>{ready.length}</b> application
          {ready.length === 1 ? '' : 's'} I am about to submit, in my capacity as <b>Reviewer</b>.
        </p>
        <p>
          I confirm that I have conducted each review objectively, independently, and to the best of my professional
          knowledge and judgment. I further declare that:
        </p>
        <ul style={{ margin: '0 0 0 2px', paddingLeft: 18, lineHeight: 1.7 }}>
          <li>I have no conflict of interest that could influence my reviews of these applications.</li>
          <li>My scores, comments and recommendations are based solely on professional assessment.</li>
          <li>I understand my reviews contribute to the quality assurance and governance process of Zemen Bank S.C.</li>
        </ul>
      </div>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
          Type <b style={{ color: 'var(--brand)' }}>submit all</b> to confirm
        </label>
        <Input
          value={typed}
          autoFocus
          placeholder="submit all"
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canConfirm && !busy) void doSubmit();
          }}
        />
        <div className="hint" style={{ marginTop: 6 }}>
          This submits all {ready.length} fully-evaluated assessments at once — it cannot be undone.
        </div>
        {error && <div className="errmsg" style={{ marginTop: 8 }}>{error}</div>}
      </div>
    </Modal>
  );
}
