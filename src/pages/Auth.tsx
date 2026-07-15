import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Laptop, Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useAuth, SESSION_END_REASON_KEY } from '../auth/AuthContext';
import { authApi } from '../lib/auth-api';
import { HttpError } from '../lib/api';
import { isLoginChallenge, type LoginResult } from '../lib/types';
import { Field, Input, Logo } from '../components/ui';

type Mode = 'register' | 'login';
type Step = 'form' | 'otp' | 'twofactor' | 'conflict';

const homeFor = (role: string) =>
  role === 'admin'
    ? '/admin'
    : role === 'reviewer'
      ? '/review'
      : role === 'auditor'
        ? '/audit'
        : role === 'recommender'
          ? '/recommend'
          : '/apply';

interface RecommendState {
  recommendToken?: string;
  recommendEmail?: string;
  recommenderName?: string;
}

const OTP_LENGTH = 4;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();

  const rec = (location.state as RecommendState | null) ?? null;

  const initialMode: Mode = rec?.recommendToken ? 'register' : params.get('mode') === 'login' ? 'login' : 'register';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>('form');

  const [email, setEmail] = useState(rec?.recommendEmail ?? '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [devCode, setDevCode] = useState<string | null>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Mid-login state: 2FA challenge and/or single-sign-on conflict.
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [existingSession, setExistingSession] = useState<{ ip: string | null; userAgent: string | null; at: string } | null>(null);

  useEffect(() => {
    const reason = sessionStorage.getItem(SESSION_END_REASON_KEY);
    if (reason) {
      sessionStorage.removeItem(SESSION_END_REASON_KEY);
      setSessionNotice(
        reason === 'idle'
          ? 'You were signed out after 5 minutes of inactivity.'
          : 'Your session reached its 15-minute limit — please sign in again.',
      );
      setMode('login');
    }
  }, []);

  const aside = useMemo(
    () => (
      <aside className="auth-aside">
        <div className="bg-mark" aria-hidden>
          Z
        </div>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Logo knockout height={36} />
        </div>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2>A transparent, paperless path to the boardroom.</h2>
          <p style={{ marginTop: 18, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.75)', maxWidth: 380 }}>
            Your application is handled with the highest standards of confidentiality and reviewed solely on
            merit by the Nomination &amp; Governance Committee.
          </p>
        </div>
        <div className="trust" style={{ position: 'relative', zIndex: 2 }}>
          <span>
            <Lock size={15} /> Encrypted
          </span>
          <span>
            <ShieldCheck size={15} /> Role-based access
          </span>
        </div>
      </aside>
    ),
    [],
  );

  function validateForm(): boolean {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'Required';
    else if (!emailRe.test(email)) next.email = 'Enter a valid email';
    if (mode === 'register' && !phone.trim()) next.phone = 'Required';
    if (!password) next.password = 'Required';
    else if (mode === 'register' && password.length < 8) next.password = 'At least 8 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /** Common handling for whatever authApi.login/verifyTotpLogin/confirmSessionAndLogin returns. */
  function handleLoginResult(result: LoginResult) {
    if (!isLoginChallenge(result)) {
      setSession(result);
      navigate(result.user.mustChangePassword ? '/change-password' : homeFor(result.user.role));
      return;
    }
    setChallengeToken(result.challengeToken);
    if (result.twoFactorRequired) {
      setTotpCode('');
      setStep('twofactor');
    } else if (result.sessionConflict) {
      setExistingSession(result.existingSession ?? null);
      setStep('conflict');
    }
  }

  async function onSubmitForm(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validateForm()) return;
    setBusy(true);
    try {
      if (mode === 'register') {
        const res = await authApi.register({ email, phone, password, recommendationToken: rec?.recommendToken });
        setDevCode(res.devCode ?? null);
        setStep('otp');
      } else {
        handleLoginResult(await authApi.login({ email, password }));
      }
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitTwoFactor(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!challengeToken) return;
    if (totpCode.length !== 6) {
      setFormError('Enter the 6-digit code from your authenticator app');
      return;
    }
    setBusy(true);
    try {
      handleLoginResult(await authApi.verifyTotpLogin({ challengeToken, code: totpCode }));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmSession() {
    setFormError(null);
    if (!challengeToken) return;
    setBusy(true);
    try {
      const session = await authApi.confirmSessionAndLogin(challengeToken);
      setSession(session);
      navigate(session.user.mustChangePassword ? '/change-password' : homeFor(session.user.role));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  function backToForm() {
    setStep('form');
    setChallengeToken(null);
    setTotpCode('');
    setExistingSession(null);
    setFormError(null);
  }

  async function onSubmitOtp(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setFormError('Enter the 4-digit code');
      return;
    }
    setBusy(true);
    try {
      const session = await authApi.verifyOtp({ email, code });
      setSession(session);
      navigate(homeFor(session.user.role));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  function handleError(err: unknown) {
    if (err instanceof HttpError) {
      setFormError(err.messages.join(' · '));
    } else {
      setFormError('Something went wrong. Please try again.');
    }
  }

  function onOtpChange(i: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[i] = digit;
      return next;
    });
    if (digit && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
  }

  function onOtpKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  }

  async function resend() {
    setFormError(null);
    try {
      const res = await authApi.resendOtp(email);
      if (res.devCode) setDevCode(res.devCode);
      setFormError('A new code has been sent.');
    } catch (err) {
      handleError(err);
    }
  }

  return (
    <div className="auth-wrap">
      {aside}
      <main className="auth-main">
        <div className="auth-card fade-up">
          {step === 'form' ? (
            <>
              <button className="btn btn-link" style={{ padding: '4px 0', marginBottom: 14 }} onClick={() => navigate('/')}>
                <ArrowLeft size={15} /> Back
              </button>

              <h2 className="serif" style={{ fontSize: 27, marginBottom: 6 }}>
                {mode === 'register' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="muted" style={{ marginBottom: rec?.recommenderName ? 14 : 22, fontSize: 14 }}>
                {mode === 'register'
                  ? 'Register to begin your Independent Director application.'
                  : 'Sign in to continue or track your application.'}
              </p>
              {rec?.recommenderName && (
                <div className="indep-banner info" style={{ marginBottom: 20, fontSize: 13 }}>
                  <BadgeCheck size={18} style={{ flex: '0 0 auto' }} />
                  <span>
                    Recommended by <b>{rec.recommenderName}</b> — create your applicant account to apply.
                  </span>
                </div>
              )}
              {sessionNotice && (
                <div className="indep-banner info" style={{ marginBottom: 20, fontSize: 13 }}>
                  <TriangleAlert size={18} style={{ flex: '0 0 auto' }} />
                  <span>{sessionNotice}</span>
                </div>
              )}

              <div className="auth-tabs" role="tablist">
                <button
                  className={mode === 'register' ? 'active' : ''}
                  onClick={() => {
                    setMode('register');
                    setErrors({});
                    setFormError(null);
                  }}
                >
                  Register
                </button>
                <button
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => {
                    setMode('login');
                    setErrors({});
                    setFormError(null);
                  }}
                >
                  Sign in
                </button>
              </div>

              <form className="auth-form" onSubmit={onSubmitForm} noValidate>
                <Field label="Email" required error={errors.email}>
                  <Input
                    type="email"
                    value={email}
                    invalid={!!errors.email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Field>

                {mode === 'register' && (
                  <Field label="Mobile" required error={errors.phone}>
                    <Input
                      type="tel"
                      value={phone}
                      invalid={!!errors.phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+251…"
                      autoComplete="tel"
                    />
                  </Field>
                )}

                <Field
                  label="Password"
                  required
                  hint={mode === 'register' ? 'Min 8 characters' : undefined}
                  error={errors.password}
                >
                  <Input
                    type="password"
                    value={password}
                    invalid={!!errors.password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  />
                </Field>

                {mode === 'login' && (
                  <div style={{ textAlign: 'right', marginTop: -6 }}>
                    <button type="button" className="btn btn-link" onClick={() => navigate('/forgot-password')}>
                      Forgot password?
                    </button>
                  </div>
                )}

                {formError && <div className="errmsg">{formError}</div>}

                <button className="btn btn-primary btn-block btn-lg" disabled={busy} type="submit">
                  {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
                </button>

                {mode === 'register' && (
                  <p className="muted" style={{ fontSize: 12, marginTop: 4, textAlign: 'center', lineHeight: 1.5 }}>
                    By continuing you agree to the processing of your data for the purpose of director recruitment
                    in line with the Bank’s privacy policy.
                  </p>
                )}
              </form>
            </>
          ) : step === 'otp' ? (
            <form className="auth-form" onSubmit={onSubmitOtp}>
              <button
                type="button"
                className="btn btn-link"
                style={{ padding: '4px 0', alignSelf: 'flex-start' }}
                onClick={() => setStep('form')}
              >
                <ArrowLeft size={15} /> Back
              </button>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 13,
                  background: 'var(--brand-tint)',
                  color: 'var(--brand-700)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <ShieldCheck size={26} />
              </div>
              <h2 className="serif" style={{ fontSize: 27 }}>
                Verify your account
              </h2>
              <p className="muted" style={{ fontSize: 14 }}>
                We sent a {OTP_LENGTH}-digit one-time password to <strong style={{ color: 'var(--ink)' }}>{email}</strong>.
                Enter it below to continue.
              </p>

              {devCode && (
                <div
                  className="indep-banner info"
                  style={{ marginBottom: 18, alignItems: 'center', justifyContent: 'center' }}
                >
                  <ShieldCheck size={18} style={{ flex: '0 0 auto' }} />
                  <span>
                    Demo environment (email is off) — your code is{' '}
                    <b className="mono" style={{ fontSize: 16, letterSpacing: '.15em' }}>{devCode}</b>
                  </span>
                </div>
              )}

              <div className="otp-row">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    className="otp-box"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => onOtpChange(i, e.target.value)}
                    onKeyDown={(e) => onOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {formError && <div className="errmsg" style={{ justifyContent: 'center' }}>{formError}</div>}

              <button className="btn btn-primary btn-block btn-lg" disabled={busy} type="submit">
                {busy ? 'Verifying…' : 'Verify & continue'}
              </button>
              <div style={{ textAlign: 'center', fontSize: 13 }}>
                <span className="muted">Didn’t receive it? </span>
                <button type="button" className="btn btn-link" style={{ fontSize: 13, padding: 0 }} onClick={() => void resend()}>
                  Resend code
                </button>
              </div>
            </form>
          ) : step === 'twofactor' ? (
            <form className="auth-form" onSubmit={onSubmitTwoFactor}>
              <button type="button" className="btn btn-link" style={{ padding: '4px 0', alignSelf: 'flex-start' }} onClick={backToForm}>
                <ArrowLeft size={15} /> Back
              </button>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 13,
                  background: 'var(--brand-tint)',
                  color: 'var(--brand-700)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <ShieldCheck size={26} />
              </div>
              <h2 className="serif" style={{ fontSize: 27 }}>
                Two-factor authentication
              </h2>
              <p className="muted" style={{ fontSize: 14 }}>
                Enter the 6-digit code from your authenticator app.
              </p>

              <Field label="Authenticator code" required>
                <Input
                  inputMode="numeric"
                  value={totpCode}
                  autoFocus
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={{ letterSpacing: '.3em', textAlign: 'center', fontSize: 20 }}
                />
              </Field>

              {formError && <div className="errmsg" style={{ justifyContent: 'center' }}>{formError}</div>}

              <button className="btn btn-primary btn-block btn-lg" disabled={busy} type="submit">
                {busy ? 'Verifying…' : 'Verify & continue'}
              </button>
            </form>
          ) : (
            <div className="auth-form">
              <button type="button" className="btn btn-link" style={{ padding: '4px 0', alignSelf: 'flex-start' }} onClick={backToForm}>
                <ArrowLeft size={15} /> Back
              </button>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 13,
                  background: 'var(--brand-tint)',
                  color: 'var(--brand-700)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Laptop size={26} />
              </div>
              <h2 className="serif" style={{ fontSize: 27 }}>
                You&rsquo;re already signed in elsewhere
              </h2>
              <p className="muted" style={{ fontSize: 14 }}>
                This account has an active session on another device. Since only one session is allowed at a time,
                continuing here will sign that device out.
              </p>

              {existingSession && (
                <div className="card" style={{ padding: 14, fontSize: 13, display: 'grid', gap: 6 }}>
                  <div>
                    <span className="muted">IP address:</span> <b>{existingSession.ip ?? 'Unknown'}</b>
                  </div>
                  <div>
                    <span className="muted">Device:</span> <b>{existingSession.userAgent ?? 'Unknown'}</b>
                  </div>
                  <div>
                    <span className="muted">Signed in:</span>{' '}
                    <b>{new Date(existingSession.at).toLocaleString()}</b>
                  </div>
                </div>
              )}

              {formError && <div className="errmsg" style={{ justifyContent: 'center' }}>{formError}</div>}

              <button className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={() => void onConfirmSession()}>
                {busy ? 'Please wait…' : 'Sign out other device & continue'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
