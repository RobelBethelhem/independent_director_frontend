import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Check,
  Clock,
  Download,
  Eye,
  Lock,
  Mail,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Star,
  TriangleAlert,
  X,
} from 'lucide-react';
import { adminApi, type AdminDetail } from '../../lib/admin-api';
import { Avatar, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import { GroupedDocs } from '../../components/GroupedDocs';
import { DocumentPreview } from '../../components/DocumentPreview';
import { HttpError } from '../../lib/api';
import { CRITERIA, DECLARATIONS } from '../../lib/constants';
import { fmtDate, fmtDateTime } from '../../lib/format';
import { scoreClass } from '../../lib/constants';

const STATUSES: { value: string; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'info_requested', label: 'Information Requested' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'not_selected', label: 'Not Selected' },
  { value: 'selected', label: 'Selected' },
];

const fullName = (a: AdminDetail) => [a.title, a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ');

export function ApplicantDrawer({
  id,
  statusLocked = false,
  lockedUntil = null,
  onClose,
  onChanged,
}: {
  id: string;
  statusLocked?: boolean;
  lockedUntil?: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [a, setA] = useState<AdminDetail | null>(null);
  const [tab, setTab] = useState<'profile' | 'documents' | 'declarations' | 'evaluation' | 'activity'>('profile');
  const [msgOpen, setMsgOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  useEffect(() => {
    void adminApi.detail(id).then(setA);
  }, [id]);

  return (
    <div className="drawer-overlay" onMouseDown={onClose}>
      <div className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        {a && (
          <>
            <div className="drawer-head">
              <Avatar seed={a.reference ?? a.id} initials={`${a.firstName?.[0] ?? ''}${a.lastName?.[0] ?? ''}`} size={52} />
              <div style={{ flex: 1 }}>
                <h2 className="serif" style={{ fontSize: 22 }}>
                  {fullName(a)}
                </h2>
                <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 2 }}>{a.role}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 9 }}>
                  <span className="ref-mono">{a.reference}</span>
                  <StatusBadge status={a.status} />
                  {a.flags > 0 && (
                    <span className="flag">
                      <TriangleAlert size={11} /> {a.flags} flag{a.flags > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <button className="iconbtn" onClick={onClose} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="tabs">
                {([
                  ['profile', 'Profile'],
                  ['documents', 'Documents'],
                  ['declarations', 'Declarations'],
                  ['evaluation', 'Evaluation'],
                  ['activity', 'Activity'],
                ] as const).map(([k, l]) => (
                  <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
                    {l}
                  </button>
                ))}
              </div>

              {tab === 'profile' && <ProfileTab a={a} />}
              {tab === 'documents' && <DocsTab a={a} onPreview={setPreviewDocId} />}
              {tab === 'declarations' && <DeclTab a={a} />}
              {tab === 'evaluation' && <EvaluationTab a={a} />}
              {tab === 'activity' && <ActivityTab a={a} />}
            </div>

            <div className="drawer-foot">
              <button className="btn btn-ghost" onClick={() => setMsgOpen(true)}>
                <MessageSquare size={17} /> Message
              </button>
              <button className="btn btn-ghost">
                <Download size={17} /> Download all
              </button>
              <div style={{ flex: 1 }} />
              <button
                className="btn btn-dark"
                disabled={statusLocked}
                title={statusLocked ? `Locked while review is active${lockedUntil ? ` (until ${fmtDateTime(lockedUntil)})` : ''}` : undefined}
                onClick={() => {
                  setStatusError(null);
                  setStatusOpen(true);
                }}
              >
                {statusLocked ? <Lock size={17} /> : <RefreshCw size={17} />} Update status
              </button>
            </div>

            {msgOpen && <MessageModal a={a} onClose={() => setMsgOpen(false)} />}
            {statusOpen && (
              <StatusModal
                a={a}
                error={statusError}
                onClose={() => setStatusOpen(false)}
                onSaved={async (status) => {
                  setStatusError(null);
                  try {
                    await adminApi.updateStatus(a.id, status);
                    setA({ ...a, status: status as AdminDetail['status'] });
                    setStatusOpen(false);
                    onChanged();
                  } catch (err) {
                    setStatusError(err instanceof HttpError ? err.messages.join(' · ') : 'Could not update status.');
                  }
                }}
              />
            )}
          </>
        )}
      </div>
      {a && previewDocId && (
        <DocumentPreview
          loadPreview={() => adminApi.preview(a.id, previewDocId)}
          loadDownload={() => adminApi.download(a.id, previewDocId)}
          onClose={() => setPreviewDocId(null)}
        />
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          marginBottom: 11,
          paddingBottom: 8,
          borderBottom: '1px solid var(--line)',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ProfileTab({ a }: { a: AdminDetail }) {
  return (
    <div className="fade-in">
      {a.recommendation && (
        <div className="indep-banner info" style={{ alignItems: 'flex-start' }}>
          <BadgeCheck size={18} style={{ flex: '0 0 auto', marginTop: 1 }} />
          <div style={{ fontWeight: 500 }}>
            Recommended by <b>{a.recommendation.recommendedBy}</b>
            {a.recommendation.recommenderEmail ? ` (${a.recommendation.recommenderEmail})` : ''} — this applicant
            registered via a recommendation link.
            {a.recommendation.message && (
              <div style={{ marginTop: 6, fontStyle: 'italic', color: 'var(--ink-2)' }}>“{a.recommendation.message}”</div>
            )}
          </div>
        </div>
      )}
      <Block title="Overview">
        <dl className="kv" style={{ marginBottom: 18 }}>
          <dt>Current role</dt>
          <dd>{a.role}</dd>
          <dt>Country</dt>
          <dd>{[a.city, a.country].filter(Boolean).join(', ') || '—'}</dd>
          <dt>Experience</dt>
          <dd>{a.years != null ? `${a.years} years` : '—'}</dd>
          <dt>Board appointments</dt>
          <dd>{a.boards} positions</dd>
        </dl>
      </Block>
      <Block title="Areas of expertise">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {a.expertise.length ? a.expertise.map((e) => <span key={e} className="chip">{e}</span>) : <span className="muted">—</span>}
        </div>
      </Block>
      <Block title="Profile summary">
        <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>
          A seasoned professional
          {a.years != null ? ` with ${a.years} years of experience` : ''} and {a.boards} board appointment
          {a.boards === 1 ? '' : 's'}
          {a.expertise[0] ? ` across the ${a.expertise[0].toLowerCase()} domain` : ''}. Currently serving as{' '}
          {a.role.toLowerCase()}
          {a.city || a.country ? `, based in ${[a.city, a.country].filter(Boolean).join(', ')}` : ''}. Submitted an
          application for an Independent Director position and is being assessed against the Bank’s
          fit-and-proper and independence criteria.
        </p>
      </Block>
      <Block title="References">
        {a.references.filter((r) => r.name).length === 0 ? (
          <span className="muted">—</span>
        ) : (
          <dl className="kv">
            {a.references.filter((r) => r.name).map((r, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <dt>{r.name}</dt>
                <dd>
                  {[r.positionOrg, r.relationship].filter(Boolean).join(' · ') || '—'}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Block>
      {a.conflictsText && (
        <Block title="Conflict of interest disclosure">
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>{a.conflictsText}</p>
        </Block>
      )}
    </div>
  );
}

function DocsTab({ a, onPreview }: { a: AdminDetail; onPreview: (id: string) => void }) {
  return (
    <div className="fade-in">
      <GroupedDocs documents={a.documents} onPreview={onPreview} emptyText="No documents uploaded." />
    </div>
  );
}

function DeclTab({ a }: { a: AdminDetail }) {
  const byId = new Map(a.declarations.map((d) => [d.itemId, d]));
  return (
    <div className="fade-in">
      {a.flags > 0 ? (
        <div className="indep-banner flag" style={{ marginBottom: 18 }}>
          <TriangleAlert size={18} /> {a.flags} declaration(s) flagged — review explanations below.
        </div>
      ) : (
        <div className="indep-banner clear" style={{ marginBottom: 18 }}>
          <ShieldCheck size={18} /> No independence concerns indicated.
        </div>
      )}
      {DECLARATIONS.map((g) => (
        <div key={g.group} style={{ marginBottom: 16 }}>
          <div className="decl-group-h" style={{ fontSize: 12.5 }}>
            {g.group}
          </div>
          {g.items.map((it) => {
            const d = byId.get(it.id);
            const yes = d?.answer === 'yes';
            return (
              <div key={it.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <span className={`badge ${yes ? 'badge-info' : 'badge-short'}`} style={{ flex: '0 0 auto' }}>
                  {yes ? 'Yes' : 'No'}
                </span>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>
                  {it.q}
                  {yes && d?.explanation && (
                    <div style={{ marginTop: 6, fontSize: 12, fontStyle: 'italic', color: 'var(--warn)' }}>{d.explanation}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const ACTION_META: Record<string, { icon: React.ReactNode; title: string }> = {
  'application.submit': { icon: <Check size={15} />, title: 'Application submitted' },
  'admin.status_change': { icon: <Eye size={15} />, title: 'Status updated' },
  'admin.message': { icon: <Mail size={15} />, title: 'Message sent' },
  'review.submit': { icon: <Star size={15} />, title: 'Reviewer assessment submitted' },
};

function ActivityTab({ a }: { a: AdminDetail }) {
  const events = a.activity.length
    ? a.activity
    : [{ action: 'application.submit', at: a.submittedAt, metadata: null }];
  return (
    <div className="fade-in">
      {events.map((e, i) => {
        const meta = ACTION_META[e.action] ?? { icon: <Clock size={15} />, title: e.action };
        const detail =
          e.action === 'admin.status_change' && e.metadata
            ? `→ ${String((e.metadata as { to?: string }).to ?? '')}`
            : '';
        return (
          <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)' }}>
                {meta.icon}
              </div>
              {i < events.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--line)', marginTop: 4, minHeight: 14 }} />}
            </div>
            <div style={{ flex: 1, paddingTop: 5 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                {meta.title} {detail}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{fmtDate(e.at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CRIT_LABEL: Record<string, string> = Object.fromEntries(CRITERIA.map((c) => [c.id, c.label]));

function EvaluationTab({ a }: { a: AdminDetail }) {
  const ev = a.evaluation;
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div
          style={{
            minWidth: 96,
            textAlign: 'center',
            padding: '14px 10px',
            borderRadius: 'var(--r)',
            background: 'var(--ink)',
            color: '#fff',
          }}
        >
          <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', fontWeight: 700 }}>
            Aggregate
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>
            {ev.aggregateScore ?? '—'}
            <span style={{ fontSize: 15, color: 'rgba(255,255,255,.5)' }}>/100</span>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
          Average of <b>{ev.submittedCount}</b> submitted assessment{ev.submittedCount === 1 ? '' : 's'}
          {ev.reviewerCount > ev.submittedCount ? ` (${ev.reviewerCount - ev.submittedCount} in progress)` : ''}.
          <br />
          Scored against the NRC rubric (Document 50% + Interview 50%).
        </div>
      </div>

      <Block title="By criterion (average)">
        {ev.submittedCount === 0 ? (
          <span className="muted">No submitted assessments yet.</span>
        ) : (
          ev.criteria.map((c) => (
            <div key={c.criterionId} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
              <div style={{ flex: 1, fontSize: 13 }}>
                {CRIT_LABEL[c.criterionId] ?? c.criterionId}
                <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>· {c.weight}%</span>
              </div>
              <div style={{ width: 120, height: 7, background: 'var(--paper-2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${((c.average ?? 0) / c.max) * 100}%`, height: '100%', background: 'var(--brand)' }} />
              </div>
              <div style={{ width: 40, textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                {c.average ?? '—'}
                <span className="muted" style={{ fontWeight: 400 }}>/{c.max}</span>
              </div>
            </div>
          ))
        )}
      </Block>

      <Block title={`Reviewers (${ev.reviewerCount})`}>
        {ev.reviewers.length === 0 ? (
          <span className="muted">No reviewer has opened this candidate yet.</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {ev.reviewers.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)' }}>
                <Avatar seed={r.name} initials={r.name.slice(0, 2)} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    {r.submitted ? 'Submitted' : 'In progress'}
                    {r.shortlistRecommended && ' · recommends shortlist'}
                  </div>
                </div>
                {r.submitted && r.weightedScore != null ? (
                  <span className={`scorepill ${scoreClass(r.weightedScore)}`}>{r.weightedScore}</span>
                ) : (
                  <span className="scorepill none">—</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Block>
    </div>
  );
}

function MessageModal({ a, onClose }: { a: AdminDetail; onClose: () => void }) {
  const templates: Record<string, string> = {
    '': '',
    ack: `Dear ${a.firstName},\n\nThank you for your application for the Independent Director position. This message confirms it is under review.\n\nKind regards,\nCompany Secretariat`,
    info_request: `Dear ${a.firstName},\n\nThe Nomination & Governance Committee requests additional information regarding your application. Please provide clarification on the highlighted declaration item.\n\nKind regards,\nCompany Secretariat`,
    interview: `Dear ${a.firstName},\n\nWe are pleased to invite you to an interview as part of the Independent Director selection process. Our office will contact you to arrange a suitable time.\n\nKind regards,\nCompany Secretariat`,
  };
  const TEMPLATE_OPTIONS = ['Blank message', 'Acknowledgement', 'Request information', 'Interview invitation'];
  const TEMPLATE_VALUE: Record<string, string> = {
    'Blank message': '',
    Acknowledgement: 'ack',
    'Request information': 'info_request',
    'Interview invitation': 'interview',
  };
  const [tmplLabel, setTmplLabel] = useState('Blank message');
  const [body, setBody] = useState('');
  const [sms, setSms] = useState(true);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      await adminApi.message(a.id, {
        channel: sms ? 'both' : 'email',
        template: TEMPLATE_VALUE[tmplLabel] || 'blank',
        body,
      });
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      title="Message applicant"
      width={560}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={sending || !body.trim()} onClick={() => void send()}>
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="To">
          <Input value={`${[a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ')}  ·  ${a.reference}`} readOnly style={{ background: 'var(--surface-2)' }} />
        </Field>
        <Field label="Template">
          <Select
            value={tmplLabel}
            options={TEMPLATE_OPTIONS}
            onChange={(e) => {
              setTmplLabel(e.target.value);
              setBody(templates[TEMPLATE_VALUE[e.target.value]] ?? '');
            }}
          />
        </Field>
        <Field label="Message">
          <Textarea value={body} rows={7} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" />
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600 }}>
          <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} />
          Also send as SMS notification
        </label>
      </div>
    </Modal>
  );
}

function StatusModal({
  a,
  error,
  onClose,
  onSaved,
}: {
  a: AdminDetail;
  error?: string | null;
  onClose: () => void;
  onSaved: (status: string) => void;
}) {
  const [st, setSt] = useState<string>(a.status);
  return (
    <Modal
      title="Update application status"
      width={480}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => onSaved(st)}>
            Save status
          </button>
        </>
      }
    >
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>
        Set the status for{' '}
        <b style={{ color: 'var(--ink)' }}>
          {[a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ')}
        </b>
        . The applicant can see this in their tracker; email/SMS notification is queued for the next bulk send
        from Review settings.
      </p>
      {error && <div className="errmsg" style={{ marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STATUSES.map((o) => (
          <label
            key={o.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              border: `1.4px solid ${st === o.value ? 'var(--brand)' : 'var(--line-2)'}`,
              borderRadius: 9,
              cursor: 'pointer',
              background: st === o.value ? 'var(--brand-tint)' : 'var(--surface)',
            }}
          >
            <input type="radio" checked={st === o.value} onChange={() => setSt(o.value)} style={{ accentColor: 'var(--brand)' }} />
            <StatusBadge status={o.value} />
          </label>
        ))}
      </div>
    </Modal>
  );
}
