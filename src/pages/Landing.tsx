import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ExternalLink, FileText, Globe, Save, ShieldCheck } from 'lucide-react';
import { MANDATORY_REQUIREMENTS, NBE_PROCLAMATION_LABEL, NBE_PROCLAMATION_URL } from '../lib/constants';
import { fmtCountdown, fmtDay, fmtWhen, useAppWindow } from '../lib/useAppWindow';

/**
 * Public landing (Applicant.Landing). Hero + info card + 3-up feature row.
 * CTAs route into the auth flow in register vs. login mode.
 */
export function Landing() {
  const navigate = useNavigate();
  const w = useAppWindow();

  return (
    <div className="fade-up">
      <section className="hero">
        <div className="bg-mark" aria-hidden>
          Z
        </div>
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">Zemen Bank · Board Recruitment</div>
            <h1 style={{ marginTop: 16 }}>
              Apply to serve as an <span className="accent">Independent Director</span> of Zemen Bank
            </h1>
            <p className="lede">
              A fully digital, paperless application for individuals seeking to join the Board as an
              Independent Director. Save your progress and submit securely from anywhere.
            </p>
            <div className="actions">
              <button className="btn btn-ghost btn-lg" onClick={() => navigate('/auth?mode=login')}>
                Continue / track application
              </button>
            </div>
          </div>

          <aside className="hero-card">
            <div
              className="eyebrow"
              style={{ color: w.phase === 'open' ? 'var(--ok)' : w.phase === 'before' ? 'var(--brand-700)' : 'var(--brand)' }}
            >
              {w.phase === 'open' ? 'Application window open' : w.phase === 'before' ? 'Applications open soon' : 'Applications closed'}
            </div>
            {w.phase === 'before' && w.remainingToOpen !== null && (
              <div className="hc-cd">
                <span className="hc-cd-k">Opens in</span>
                <span className="hc-cd-v">{fmtCountdown(w.remainingToOpen)}</span>
              </div>
            )}
            {w.phase === 'open' && w.remainingToClose !== null && (
              <div className="hc-cd">
                <span className="hc-cd-k">Closes in</span>
                <span className="hc-cd-v">{fmtCountdown(w.remainingToClose)}</span>
              </div>
            )}
            <div className="kv">
              <span className="k">Opens</span>
              <span className="v">{fmtWhen(w.opensAt)}</span>
            </div>
            <div className="kv">
              <span className="k">Closes</span>
              <span className="v">{w.closesAt !== null ? fmtWhen(w.closesAt) : '—'}</span>
            </div>
            <div className="kv">
              <span className="k">Eligibility</span>
              <span className="v">Independent of ownership & management</span>
            </div>
            <div className="kv">
              <span className="k">Time</span>
              <span className="v">~20–30 minutes</span>
            </div>
            <div className="kv">
              <span className="k">Documents</span>
              <span className="v">CV, certificates, ID</span>
            </div>
            <div className="kv">
              <span className="k">Process</span>
              <span className="v">Screening → Committee review → Outcome</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="container reqs">
        <div className="reqs-head">
          <div className="eyebrow">Before you begin</div>
          <h2 className="serif reqs-title">Basic &amp; mandatory requirements</h2>
          <p className="reqs-lede">
            To be eligible to serve as an Independent Director of Zemen Bank, you must meet all the requirements
            listed below. Please read them carefully, as you will be required to confirm that you meet these
            requirements before creating an account.
          </p>
        </div>

        <div className="reqs-grid">
          {MANDATORY_REQUIREMENTS.map((r) => (
            <div key={r.title} className="req-item">
              <div className="req-ic" aria-hidden>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h4>{r.title}</h4>
                <p>{r.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="reqs-actions">
          <a className="btn btn-ghost btn-lg" href={NBE_PROCLAMATION_URL} target="_blank" rel="noopener noreferrer">
            <FileText size={17} /> Read the NBE directive on independent directors
            <ExternalLink size={14} style={{ opacity: 0.7 }} />
          </a>
          {w.canApply ? (
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/auth?mode=register')}>
              I meet these requirements — start
            </button>
          ) : (
            <button className="btn btn-primary btn-lg" disabled>
              {w.phase === 'before' ? `Opens ${fmtDay(w.opensAt)}` : 'Applications closed'}
            </button>
          )}
        </div>
        {w.phase === 'before' && (
          <p className="reqs-ref">
            Registration opens on <b>{fmtWhen(w.opensAt)}</b>. Review the requirements now — you can create your account the
            moment the window opens.
          </p>
        )}
        <p className="reqs-ref">
          Governing regulation: <b>{NBE_PROCLAMATION_LABEL}</b>.
        </p>
      </section>

      <div className="container">
        <div className="feature-row">
          <div className="feature">
            <div className="fic" aria-hidden>
              <Globe size={20} />
            </div>
            <h4>Apply from anywhere</h4>
            <p>Applicants inside or outside Ethiopia can apply entirely online — no physical paperwork.</p>
          </div>
          <div className="feature">
            <div className="fic" aria-hidden>
              <Save size={20} />
            </div>
            <h4>Save & continue</h4>
            <p>Your draft is saved automatically. Return any time before the window closes to finish.</p>
          </div>
          <div className="feature">
            <div className="fic" aria-hidden>
              <ShieldCheck size={20} />
            </div>
            <h4>Secure & confidential</h4>
            <p>Encrypted in transit and at rest, with role-based access for review and screening.</p>
          </div>
        </div>
        <p className="muted" style={{ paddingBottom: 40 }}>
          Already started? <Link to="/auth?mode=login">Continue your application →</Link>
        </p>
      </div>
    </div>
  );
}
