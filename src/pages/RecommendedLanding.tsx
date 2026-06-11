import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BadgeCheck, ShieldCheck } from 'lucide-react';
import { recommendationsApi, type RecommendationInvite } from '../lib/recommendations-api';
import { Logo } from '../components/ui';

export function RecommendedLanding() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<RecommendationInvite | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void recommendationsApi
      .byToken(token)
      .then(setInvite)
      .catch(() => setError('This recommendation link is not valid or has expired.'));
  }, [token]);

  function startApplication() {
    navigate('/auth', {
      state: { recommendToken: token, recommendEmail: invite?.candidateEmail, recommenderName: invite?.recommenderName },
    });
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--paper)', padding: 24 }}>
      <div className="card" style={{ maxWidth: 540, width: '100%', padding: 0, overflow: 'hidden' }}>
        <div style={{ background: 'var(--ink)', padding: '20px 28px' }}>
          <Logo knockout height={30} />
        </div>
        <div style={{ padding: 32 }}>
          {error ? (
            <>
              <h1 style={{ fontSize: 22, marginTop: 0 }}>Link not valid</h1>
              <p className="muted">{error}</p>
              <button className="btn btn-ghost" onClick={() => navigate('/')}>Go to the portal</button>
            </>
          ) : !invite ? (
            <p className="muted">Loading your invitation…</p>
          ) : (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--brand)', fontWeight: 700, fontSize: 12.5, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 12 }}>
                <BadgeCheck size={16} /> You’ve been recommended
              </div>
              <h1 style={{ fontSize: 24, marginTop: 0, marginBottom: 10 }}>
                Hello {invite.candidateName.split(' ')[0]},
              </h1>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink-2)', marginTop: 0 }}>
                <b>{invite.recommenderName}</b> has recommended you as a strong candidate for an{' '}
                <b>Independent Director</b> position on the Board of Zemen Bank S.C.
              </p>
              {invite.message && (
                <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)', margin: '16px 0', padding: '14px 16px', background: 'var(--surface-2)', borderLeft: '3px solid var(--brand)', borderRadius: 8 }}>
                  <b>{invite.recommenderName} writes:</b>
                  <div style={{ marginTop: 4, fontStyle: 'italic' }}>“{invite.message}”</div>
                </div>
              )}
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                Independent Directors bring objective, expert oversight to the Bank’s governance. We warmly invite you to
                submit your application through our secure portal.
              </p>
              <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={startApplication}>
                Start your application <ArrowRight size={16} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', marginTop: 16, fontSize: 12, color: 'var(--ink-3)' }}>
                <ShieldCheck size={14} /> Your information is handled with strict confidentiality.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
