import { useEffect, useState } from 'react';
import { Check, Clock, Lock, TriangleAlert } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { applicationsApi, type ApplicationStatusResponse } from '../lib/applications-api';
import type { Application } from '../lib/types';
import { StatusBadge } from '../components/StatusBadge';
import { fmtDate } from '../lib/format';

export function Tracking() {
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [status, setStatus] = useState<ApplicationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const mine = await applicationsApi.mine();
        if (!mine || mine.status === 'draft') {
          setRedirect(true);
          return;
        }
        setApp(mine);
        setStatus(await applicationsApi.status(mine.id));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (redirect) return <Navigate to="/apply" replace />;
  if (loading) {
    return (
      <div className="container muted" style={{ padding: '60px 0' }}>
        Loading…
      </div>
    );
  }
  if (!app || !status) {
    return (
      <div className="container" style={{ padding: '60px 0' }}>
        <p className="errmsg">Could not load your application status.</p>
      </div>
    );
  }

  const name = [app.title, app.firstName, app.middleName, app.lastName].filter(Boolean).join(' ') || '—';
  const docCount = app.documents?.length ?? 0;

  return (
    <div className="wrap-narrow" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div className="eyebrow">Application status</div>
          <h1 className="serif" style={{ fontSize: 30, fontWeight: 500, marginTop: 6 }}>
            Track your application
          </h1>
          <div className="muted" style={{ marginTop: 6 }}>
            Reference <span className="mono">{app.reference}</span>
          </div>
        </div>
        <StatusBadge status={app.status} />
      </div>

      <div className="card card-pad">
        <div className="track-line">
          {status.timeline.map((t, i) => (
            <div key={t.label} className={`track-node${t.state === 'done' ? ' done' : ''}${t.state === 'current' ? ' current' : ''}`}>
              {i > 0 && <div className={`track-seg${t.state !== 'upcoming' ? ' done' : ''}`} />}
              <div className="tn-dot">
                {t.state === 'done' ? <Check size={17} strokeWidth={3} /> : t.state === 'current' ? <Clock size={16} /> : i + 1}
              </div>
              <div className="tn-lab">{t.label}</div>
              <div className="tn-date">{i === 0 ? fmtDate(status.submittedAt) : ''}</div>
            </div>
          ))}
        </div>
      </div>

      {status.infoRequested && (
        <div className="card card-pad" style={{ marginTop: 18, borderColor: 'var(--st-info)', background: 'var(--brand-tint)' }}>
          <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <div style={{ color: 'var(--st-info)' }}>
              <TriangleAlert size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: 14.5, marginBottom: 5 }}>Additional information requested</h4>
              <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                The Committee has requested clarification on your application. Please respond promptly.
              </p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} disabled>
                Respond now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card card-pad" style={{ marginTop: 18 }}>
        <h4 style={{ fontSize: 14.5, marginBottom: 14 }}>Application summary</h4>
        <dl className="kv">
          <dt>Applicant</dt>
          <dd>{name}</dd>
          <dt>Position</dt>
          <dd>Independent Director</dd>
          <dt>Submitted</dt>
          <dd>{fmtDate(status.submittedAt)}</dd>
          <dt>Documents</dt>
          <dd>{docCount} files uploaded</dd>
          <dt>Acknowledgement</dt>
          <dd>Sent to {app.email ?? '—'}</dd>
        </dl>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center' }}>
        <span className="muted" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Lock size={14} />
          Submitted applications are locked. Contact the Company Secretary for any change request.
        </span>
      </div>

      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    </div>
  );
}
