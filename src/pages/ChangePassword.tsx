import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { authApi } from '../lib/auth-api';
import { useAuth } from '../auth/AuthContext';
import { HttpError } from '../lib/api';
import { Field, Input } from '../components/ui';
import { PASSWORD_HINT, validatePassword } from '../lib/password';
import { homeFor } from '../lib/routes';

export function ChangePassword() {
  const navigate = useNavigate();
  const { user, refreshMe } = useAuth();
  const forced = !!user?.mustChangePassword;

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pwErr = validatePassword(next);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (next !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: next });
      await refreshMe();
      navigate(homeFor(user?.role ?? 'applicant'), { replace: true });
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Could not change your password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="wrap" style={{ maxWidth: 460, padding: '60px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <KeyRound size={20} color="var(--brand)" />
          <div className="eyebrow" style={{ margin: 0 }}>Account security</div>
        </div>
        <h1 style={{ marginTop: 4 }}>{forced ? 'Set your password' : 'Change password'}</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          {forced
            ? 'Your account was created with a temporary password. Please choose a new password to continue.'
            : 'Update the password you use to sign in.'}
        </p>

        <form onSubmit={submit} className="card" style={{ padding: 22, display: 'grid', gap: 14 }}>
          <Field label={forced ? 'Temporary password' : 'Current password'} required>
            <Input
              type="password"
              value={current}
              autoFocus
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Enter the password you signed in with"
            />
          </Field>
          <Field label="New password" required hint={PASSWORD_HINT}>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Choose a new password" />
          </Field>
          <Field label="Confirm new password" required>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter the new password" />
          </Field>
          {error && <div className="errmsg">{error}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            <ShieldCheck size={16} /> {busy ? 'Saving…' : 'Set password & continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
