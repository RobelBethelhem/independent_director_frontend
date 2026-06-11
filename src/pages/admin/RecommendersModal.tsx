import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { adminApi, type StaffRow } from '../../lib/admin-api';
import { HttpError } from '../../lib/api';
import { Field, Input, Modal } from '../../components/ui';
import { CredentialBox } from '../../components/CredentialBox';
import { fmtDate } from '../../lib/format';

export function RecommendersModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<StaffRow[] | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; email: string; tempPassword: string } | null>(null);

  async function load() {
    setRows(await adminApi.recommenders());
  }
  useEffect(() => {
    void load();
  }, []);

  async function add() {
    setError(null);
    setDone(null);
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setBusy(true);
    try {
      const res = await adminApi.createUser({ name, email, phone: phone || undefined, role: 'recommender' });
      setDone({ name, email, tempPassword: res.tempPassword });
      setName('');
      setEmail('');
      setPhone('');
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Could not add recommender.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Recommenders (Talent Referral)" width={640} onClose={onClose}>
      <p className="muted" style={{ marginTop: 0, marginBottom: 18, fontSize: 13 }}>
        Recommenders can invite candidates to apply by email. Each invitation is tracked, and the recommender is shown to
        reviewers and admins on the resulting application.
      </p>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
          Add a recommender
        </div>
        <div className="grid-2" style={{ marginBottom: 12 }}>
          <Field label="Full name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Yonas Alemu" />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251…" />
          </Field>
        </div>
        {error && <div className="errmsg" style={{ marginBottom: 8 }}>{error}</div>}
        {done && <CredentialBox name={done.name} email={done.email} tempPassword={done.tempPassword} />}
        <button className="btn btn-primary" disabled={busy} onClick={() => void add()}>
          <UserPlus size={16} /> {busy ? 'Creating…' : 'Create recommender & email credentials'}
        </button>
      </div>

      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
        Current recommenders
      </div>
      {!rows ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">No recommenders yet.</p>
      ) : (
        <div className="table-card">
          <table className="dt">
            <thead>
              <tr>
                <th>Recommender</th>
                <th>Status</th>
                <th>Last login</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ cursor: 'default' }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.name ?? r.email}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{r.email}</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{r.status}</td>
                  <td>{r.lastLoginAt ? fmtDate(r.lastLoginAt) : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
