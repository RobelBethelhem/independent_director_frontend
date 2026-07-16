import { useEffect, useState } from 'react';
import { Check, Copy, Send, UserPlus } from 'lucide-react';
import { recommendationsApi, type MyRecommendation } from '../../lib/recommendations-api';
import { HttpError } from '../../lib/api';
import { Field, Input, Textarea } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { copyText } from '../../lib/clipboard';

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  Invited: { bg: 'var(--paper-2)', fg: 'var(--ink-3)' },
  Opened: { bg: '#eaf1f8', fg: '#2b6cb0' },
  Registered: { bg: '#f3eefe', fg: '#5a4fcf' },
  Applying: { bg: 'var(--warn-bg)', fg: 'var(--warn)' },
  Submitted: { bg: 'var(--ok-bg)', fg: 'var(--ok)' },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? STATUS_COLOR.Invited;
  return (
    <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}

export function RecommenderConsole() {
  const [rows, setRows] = useState<MyRecommendation[] | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<MyRecommendation | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    setRows(await recommendationsApi.mine());
  }
  useEffect(() => {
    void load();
  }, []);

  async function submit() {
    setError(null);
    setDone(null);
    if (!name.trim() || !email.trim()) {
      setError('Candidate name and email are required.');
      return;
    }
    setBusy(true);
    try {
      const rec = await recommendationsApi.create({
        candidateName: name.trim(),
        candidateEmail: email.trim(),
        message: message.trim() || undefined,
      });
      setDone(rec);
      setName('');
      setEmail('');
      setMessage('');
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Could not send the recommendation.');
    } finally {
      setBusy(false);
    }
  }

  function copyLink(link: string) {
    void copyText(`${window.location.origin}${link}`).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="page">
      <div className="wrap" style={{ maxWidth: 920, paddingBottom: 60 }}>
        <div className="page-head">
          <div>
            <div className="eyebrow">Recommender · Talent Referral</div>
            <h1>Recommend a candidate</h1>
            <div className="ph-sub">Invite an exceptional individual to apply for an Independent Director position</div>
          </div>
        </div>

        <div className="card" style={{ padding: 22, marginBottom: 26 }}>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <Field label="Candidate full name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hanna Tesfaye" />
            </Field>
            <Field label="Candidate email" required>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            </Field>
          </div>
          <Field label="Personal note (optional)" hint="Shown to the candidate in the invitation email">
            <Textarea
              value={message}
              rows={3}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A few words on why you’re recommending them…"
            />
          </Field>
          {error && <div className="errmsg" style={{ marginTop: 8 }}>{error}</div>}
          {done && (
            <div className="indep-banner clear" style={{ display: 'block', marginTop: 12, padding: '12px 14px' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Invitation sent to {done.candidateName}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 10 }}>
                A professional email naming you as the recommender has been sent to <b>{done.candidateEmail}</b>. You can
                also share the secure link directly:
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code className="mono" style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {window.location.origin}{done.link}
                </code>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => copyLink(done.link)}>
                  {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
          <button className="btn btn-primary" disabled={busy} onClick={() => void submit()} style={{ marginTop: 14 }}>
            <Send size={16} /> {busy ? 'Sending…' : 'Send recommendation'}
          </button>
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
          Your recommendations
        </div>
        {!rows ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>
            <UserPlus size={26} style={{ opacity: 0.5 }} />
            <p style={{ marginTop: 8 }}>You haven’t recommended anyone yet.</p>
          </div>
        ) : (
          <div className="table-card">
            <table className="dt">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>Invited</th>
                  <th>Opened</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ cursor: 'default' }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.candidateName}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{r.candidateEmail}</div>
                    </td>
                    <td><StatusPill status={r.status} /></td>
                    <td>{fmtDate(r.createdAt)}</td>
                    <td>{r.clickedAt ? fmtDate(r.clickedAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
