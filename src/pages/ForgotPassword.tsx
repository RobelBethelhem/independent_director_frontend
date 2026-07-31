import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/auth-api';
import { HttpError } from '../lib/api';
import { Field, Input, Logo, PasswordInput } from '../components/ui';

/** Two-phase reset: request an emailed code, then set a new password with it. */
export function ForgotPassword() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authApi.forgotPassword(email);
      setPhase('reset');
      setNote('If an account exists, a reset code has been sent (printed to the backend console in dev).');
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authApi.resetPassword({ email, code, password });
      navigate('/auth?mode=login');
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-main" style={{ minHeight: '100vh' }}>
      <div className="auth-card fade-up">
        <div style={{ marginBottom: 24 }}>
          <Logo />
        </div>
        <h2 className="serif" style={{ fontSize: 26, marginBottom: 6 }}>
          Reset your password
        </h2>
        {note && <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>{note}</p>}

        {phase === 'request' ? (
          <form className="auth-form" onSubmit={request}>
            <Field label="Email" required>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {error && <div className="errmsg">{error}</div>}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy} type="submit">
              {busy ? 'Sending…' : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={reset}>
            <Field label="Reset code" required>
              <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="New password" required hint="Min 8 characters">
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error && <div className="errmsg">{error}</div>}
            <button className="btn btn-primary btn-block btn-lg" disabled={busy} type="submit">
              {busy ? 'Updating…' : 'Set new password'}
            </button>
          </form>
        )}
        <button className="btn btn-link" style={{ marginTop: 8 }} onClick={() => navigate('/auth?mode=login')}>
          ← Back to sign in
        </button>
      </div>
    </div>
  );
}
