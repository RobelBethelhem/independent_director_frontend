import { useEffect, useState, type DragEvent } from 'react';
import { Flag } from 'lucide-react';
import { adminApi, type AdminApplicant } from '../../lib/admin-api';
import { Avatar, Modal } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import { scoreClass } from '../../lib/constants';

/** Board columns in pipeline order (draft is excluded — admins never see drafts). */
const COLUMNS: { status: string; label: string }[] = [
  { status: 'submitted', label: 'Submitted' },
  { status: 'under_review', label: 'Under Review' },
  { status: 'info_requested', label: 'Information Requested' },
  { status: 'shortlisted', label: 'Shortlisted' },
  { status: 'selected', label: 'Selected' },
  { status: 'not_selected', label: 'Not Selected' },
];
const LABELS: Record<string, string> = Object.fromEntries(COLUMNS.map((c) => [c.status, c.label]));

const fullName = (a: AdminApplicant) => [a.title, a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ');

interface PendingMove {
  id: string;
  name: string;
  from: string;
  to: string;
}

export function AdminBoard({
  query,
  refreshKey,
  onOpen,
  onChanged,
}: {
  query: string;
  refreshKey: number;
  onOpen: (id: string) => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<AdminApplicant[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void adminApi.board().then(setItems);
  }, [refreshKey]);

  const q = query.trim().toLowerCase();
  const visible = (items ?? []).filter((a) =>
    !q
      ? true
      : [a.firstName, a.lastName, a.reference, a.country, a.role].filter(Boolean).join(' ').toLowerCase().includes(q),
  );

  function onDrop(e: DragEvent, toStatus: string) {
    e.preventDefault();
    setOverStatus(null);
    const id = e.dataTransfer.getData('text/plain') || dragId;
    const app = (items ?? []).find((x) => x.id === id);
    setDragId(null);
    if (app && app.status !== toStatus) {
      setPending({ id: app.id, name: fullName(app) || app.reference || 'this applicant', from: app.status, to: toStatus });
    }
  }

  async function confirmMove() {
    if (!pending) return;
    setSaving(true);
    try {
      await adminApi.updateStatus(pending.id, pending.to);
      setPending(null);
      onChanged(); // refreshes stats + bumps refreshKey (re-fetches this board)
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="kanban">
      {COLUMNS.map((col) => {
        const cards = visible.filter((a) => a.status === col.status);
        return (
          <div
            key={col.status}
            className={`kcol${overStatus === col.status ? ' drag-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (overStatus !== col.status) setOverStatus(col.status);
            }}
            onDrop={(e) => onDrop(e, col.status)}
          >
            <div className="kcol-head">
              <StatusBadge status={col.status} />
              <span className="kcol-count">{cards.length}</span>
            </div>
            <div className="kcol-body">
              {cards.map((a) => (
                <div
                  key={a.id}
                  className={`kcard${dragId === a.id ? ' dragging' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    setDragId(a.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', a.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverStatus(null);
                  }}
                  onClick={() => onOpen(a.id)}
                >
                  <div className="kc-top">
                    <Avatar seed={a.reference ?? a.id} initials={`${a.firstName?.[0] ?? ''}${a.lastName?.[0] ?? ''}`} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="kc-name">{fullName(a)}</div>
                      <div className="kc-role">{a.role}</div>
                    </div>
                    {a.score != null && <span className={`scorepill ${scoreClass(a.score)}`}>{a.score}</span>}
                  </div>
                  {a.evaluatorScores.some((s) => s != null) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {a.evaluatorScores.map((sv, i) => (
                        <span
                          key={i}
                          title={`Evaluator ${i + 1}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '1px 6px',
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: 'var(--surface-2)',
                            border: '1px solid var(--line-2)',
                            color: 'var(--ink-3)',
                          }}
                        >
                          E{i + 1}
                          <b style={{ color: sv == null ? 'var(--ink-4)' : 'var(--ink)' }}>{sv == null ? '—' : sv}</b>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="kc-foot">
                    <span className="ref-mono">{a.reference}</span>
                    {a.flags > 0 && (
                      <span className="flag">
                        <Flag size={11} /> {a.flags}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {cards.length === 0 && <div className="kcol-empty">Drop here</div>}
            </div>
          </div>
        );
      })}

      {pending && (
        <Modal
          title="Change application status"
          width={460}
          onClose={() => !saving && setPending(null)}
          footer={
            <>
              <button className="btn btn-ghost" disabled={saving} onClick={() => setPending(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={saving} onClick={() => void confirmMove()}>
                {saving ? 'Updating…' : 'Yes, change status'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            Move <b style={{ color: 'var(--ink)' }}>{pending.name}</b> from{' '}
            <b style={{ color: 'var(--ink)' }}>{LABELS[pending.from] ?? pending.from}</b> to{' '}
            <b style={{ color: 'var(--ink)' }}>{LABELS[pending.to] ?? pending.to}</b>?
          </p>
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            The applicant can see this in their tracker and will be notified.
          </p>
        </Modal>
      )}
    </div>
  );
}
