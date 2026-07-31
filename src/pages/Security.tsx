import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { authApi } from '../lib/auth-api';
import { useAuth } from '../auth/AuthContext';
import { HttpError } from '../lib/api';
import { Field, Input, PasswordInput } from '../components/ui';

type SetupStep = 'idle' | 'scanning';

export function Security() {
  const navigate = useNavigate();
  const { user, refreshMe } = useAuth();

  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [secret, setSecret] = useState<string | null>(null);
  const [qrDataUri, setQrDataUri] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!user) return null;

  async function startSetup() {
    setError(null);
    setBusy(true);
    try {
      const res = await authApi.setupTotp();
      setSecret(res.secret);
      setQrDataUri(res.qrDataUri);
      setConfirmCode('');
      setSetupStep('scanning');
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Could not start 2FA setup.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    setError(null);
    if (confirmCode.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app');
      return;
    }
    setBusy(true);
    try {
      await authApi.confirmTotpSetup(confirmCode);
      await refreshMe();
      setSetupStep('idle');
      setSecret(null);
      setQrDataUri(null);
      setNotice('Two-factor authentication is now enabled on your account.');
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Invalid code — please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setError(null);
    if (!disablePassword || disableCode.length !== 6) {
      setError('Enter your password and the 6-digit code from your authenticator app');
      return;
    }
    setBusy(true);
    try {
      await authApi.disableTotp({ password: disablePassword, code: disableCode });
      await refreshMe();
      setDisablePassword('');
      setDisableCode('');
      setNotice('Two-factor authentication has been disabled.');
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Could not disable 2FA.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="wrap" style={{ maxWidth: 520, padding: '60px 0' }}>
        <button className="btn btn-link" style={{ padding: '4px 0', marginBottom: 14 }} onClick={() => navigate(-1)}>
          Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ShieldCheck size={20} color="var(--brand)" />
          <div className="eyebrow" style={{ margin: 0 }}>Account security</div>
        </div>
        <h1 style={{ marginTop: 4 }}>Two-factor authentication</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Add a second step at sign-in using an authenticator app such as Google Authenticator.
        </p>

        {notice && <div className="indep-banner info" style={{ marginBottom: 18 }}>{notice}</div>}

        {user.twoFactorEnabled ? (
          <div className="card" style={{ padding: 22, display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={20} color="var(--brand)" />
              <b>Two-factor authentication is enabled</b>
            </div>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              To disable it, confirm your password and a current code from your authenticator app.
            </p>
            <Field label="Password" required>
              <PasswordInput value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} placeholder="Your current password" />
            </Field>
            <Field label="Authenticator code" required>
              <Input
                inputMode="numeric"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{ letterSpacing: '.3em' }}
              />
            </Field>
            {error && <div className="errmsg">{error}</div>}
            <button
              className="btn"
              style={{ background: 'var(--err)', color: '#fff', border: 'none' }}
              disabled={busy}
              onClick={() => void disable()}
            >
              <ShieldOff size={16} /> {busy ? 'Disabling…' : 'Disable two-factor authentication'}
            </button>
          </div>
        ) : setupStep === 'idle' ? (
          <div className="card" style={{ padding: 22, display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Smartphone size={20} color="var(--brand)" />
              <b>Two-factor authentication is not enabled</b>
            </div>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              We strongly recommend enabling 2FA to protect this account.
            </p>
            {error && <div className="errmsg">{error}</div>}
            <button className="btn btn-primary" disabled={busy} onClick={() => void startSetup()}>
              {busy ? 'Please wait…' : 'Enable two-factor authentication'}
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 22, display: 'grid', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 14 }}>
              Scan this QR code with Google Authenticator (or a compatible app), then enter the 6-digit code it shows.
            </p>
            {qrDataUri && (
              <img src={qrDataUri} alt="Scan with your authenticator app" style={{ width: 200, height: 200, alignSelf: 'center' }} />
            )}
            {secret && (
              <p className="muted" style={{ fontSize: 12, textAlign: 'center', wordBreak: 'break-all' }}>
                Can&rsquo;t scan? Enter this key manually: <b className="mono">{secret}</b>
              </p>
            )}
            <Field label="Authenticator code" required>
              <Input
                inputMode="numeric"
                autoFocus
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{ letterSpacing: '.3em', textAlign: 'center', fontSize: 20 }}
              />
            </Field>
            {error && <div className="errmsg">{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" disabled={busy} onClick={() => setSetupStep('idle')}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={() => void confirmSetup()}>
                {busy ? 'Verifying…' : 'Confirm & enable'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
