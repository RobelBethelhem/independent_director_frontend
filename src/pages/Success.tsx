import { ArrowRight, Check, Download, FileText } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const NEXT_STEPS: [string, string, string][] = [
  ['1', 'Screening', 'The Company Secretary verifies completeness and eligibility of your application.'],
  [
    '2',
    'Committee review',
    'After the window closes, the Nomination & Governance Committee reviews and scores all applicants.',
  ],
  ['3', 'Outcome', 'You will be notified by email of shortlisting, requests for information, or the final decision.'],
];

export function Success() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const reference = (location.state as { reference?: string } | null)?.reference;

  // Direct hits without a fresh submission go to the tracker.
  if (!reference) {
    return <Navigate to="/track" replace />;
  }

  return (
    <div className="container">
      <div className="success-wrap fade-up">
        <div className="success-ic">
          <Check size={42} strokeWidth={2.4} />
        </div>
        <div className="eyebrow">Application submitted</div>
        <h1 className="serif" style={{ fontSize: 34, margin: '10px 0 14px', fontWeight: 500 }}>
          Thank you — your application is in.
        </h1>
        <p className="muted" style={{ fontSize: 15.5, lineHeight: 1.6 }}>
          An acknowledgement has been sent to{' '}
          <b style={{ color: 'var(--ink)' }}>{user?.email ?? 'your email'}</b>. Please keep your reference number
          for tracking and correspondence.
        </p>
        <div className="ref-pill">
          <FileText size={18} /> {reference}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/track')}>
            Track my application <ArrowRight size={16} />
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            <Download size={16} /> Download receipt
          </button>
        </div>

        <div className="card card-pad" style={{ marginTop: 36, textAlign: 'left' }}>
          <h4 style={{ fontSize: 14, marginBottom: 14 }}>What happens next</h4>
          {NEXT_STEPS.map(([n, h, p]) => (
            <div
              key={n}
              style={{ display: 'flex', gap: 14, padding: '11px 0', borderBottom: n !== '3' ? '1px solid var(--line)' : 'none' }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'var(--ink)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flex: '0 0 auto',
                }}
              >
                {n}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{h}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2, lineHeight: 1.5 }}>{p}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
