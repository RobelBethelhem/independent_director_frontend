import { useState } from 'react';
import { CheckCircle2, Send, TriangleAlert } from 'lucide-react';
import { adminApi, type BulkNotifyResult, type PendingNotification } from '../../lib/admin-api';
import { Modal, Input } from '../../components/ui';
import { HttpError } from '../../lib/api';

/**
 * Sends every queued status-change notification (email + SMS) at once.
 * Two steps: 1) summary of who's about to be notified, 2) declaration
 * requiring "send all" to confirm. Applicants that fail to notify stay
 * queued — re-running this later retries only what's left.
 */
export function BulkNotifyModal({
  pending,
  onClose,
  onDone,
}: {
  pending: PendingNotification[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<'summary' | 'confirm'>('summary');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkNotifyResult | null>(null);
  const canConfirm = typed.trim().toLowerCase() === 'send all';

  async function doSend() {
    setBusy(true);
    setError(null);
    try {
      const res = await adminApi.sendBulkNotifications();
      setResult(res);
      onDone();
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Could not send. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Modal
        title="Bulk notifications sent"
        width={520}
        onClose={onClose}
        footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}
      >
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <CheckCircle2 size={42} color="var(--ok)" />
          <h3 style={{ marginTop: 12, marginBottom: 6 }}>
            {result.sent} of {result.total} applicant{result.total === 1 ? '' : 's'} notified
          </h3>
          {result.failed.length > 0 && (
            <div style={{ textAlign: 'left', marginTop: 16 }}>
              <p className="muted" style={{ fontSize: 13.5, marginBottom: 8 }}>
                {result.failed.length} couldn’t be reached this time — they stay queued, so sending again will
                retry only these:
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: 'var(--ink-2)' }}>
                {result.failed.map((f) => (
                  <li key={f.id}>
                    {f.name} — <span className="muted">{f.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  if (phase === 'summary') {
    return (
      <Modal
        title="Send status notifications"
        width={580}
        onClose={onClose}
        footer={
          <>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={pending.length === 0} onClick={() => setPhase('confirm')}>
              <Send size={16} /> Review &amp; send
            </button>
          </>
        }
      >
        <p style={{ marginTop: 0, fontSize: 14 }}>
          <b>{pending.length}</b> applicant{pending.length === 1 ? ' has a' : 's have'} status change{pending.length === 1 ? '' : 's'} not yet
          communicated. Sending notifies each one by email and SMS at once, independently — one delivery failure
          never blocks the rest.
        </p>
        {pending.length > 0 ? (
          <div className="table-card" style={{ maxHeight: 280, overflowY: 'auto' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>New status</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id} style={{ cursor: 'default' }}>
                    <td>{p.name}</td>
                    <td>{p.statusLabel}</td>
                    <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {[p.email, p.phone].filter(Boolean).join(' · ') || (
                        <span style={{ color: 'var(--warn)' }}>No contact on file</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 13.5 }}>Nothing queued — every applicant is up to date.</p>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      title="Confirm bulk send"
      width={520}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => setPhase('summary')} disabled={busy}>Back</button>
          <button className="btn btn-primary" disabled={!canConfirm || busy} onClick={() => void doSend()}>
            <Send size={16} /> {busy ? 'Sending…' : `Send to ${pending.length}`}
          </button>
        </>
      }
    >
      <div className="indep-banner flag" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
        <TriangleAlert size={18} style={{ flex: '0 0 auto', marginTop: 1 }} />
        <span style={{ fontWeight: 500 }}>
          This emails and texts <b>{pending.length}</b> applicant{pending.length === 1 ? '' : 's'} right now. It
          cannot be undone.
        </span>
      </div>
      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
        Type <b style={{ color: 'var(--brand)' }}>send all</b> to confirm
      </label>
      <Input
        value={typed}
        autoFocus
        placeholder="send all"
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canConfirm && !busy) void doSend();
        }}
      />
      {error && <div className="errmsg" style={{ marginTop: 8 }}>{error}</div>}
    </Modal>
  );
}
