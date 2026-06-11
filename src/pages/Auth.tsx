import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../lib/auth-api';
import { HttpError } from '../lib/api';
import { Field, Input, Logo } from '../components/ui';

type Mode = 'register' | 'login';
type Step = 'form' | 'otp';

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
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function onSubmitForm(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validateForm()) return;
    setBusy(true);
    try {
      if (mode === 'register') {
        await authApi.register({ email, phone, password, recommendationToken: rec?.recommendToken });
        setStep('otp');
      } else {
        const session = await authApi.login({ email, password });
        setSession(session);
        navigate(session.user.mustChangePassword ? '/change-password' : homeFor(session.user.role));
      }
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
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
      await authApi.resendOtp(email);
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
          ) : (
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
                Enter it below to continue. (In development the code is printed in the backend console.)
              </p>

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
          )}
        </div>
      </main>
    </div>
  );
}
