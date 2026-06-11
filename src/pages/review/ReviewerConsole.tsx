import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Download, List, Lock, Scale, Star, TriangleAlert, Users } from 'lucide-react';
import { reviewApi, type ReviewCandidate, type ReviewOverview, type ShortlistEntry } from '../../lib/review-api';
import { Avatar, Modal, Stat } from '../../components/ui';
import { scoreClass } from '../../lib/constants';
import { fmtDate } from '../../lib/format';
import { ReviewScreen } from './ReviewScreen';

export function ReviewerConsole() {
  const [overview, setOverview] = useState<ReviewOverview | null>(null);
  const [candidates, setCandidates] = useState<ReviewCandidate[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [shortlistOpen, setShortlistOpen] = useState(false);

  async function reload() {
    const ov = await reviewApi.overview();
    setOverview(ov);
    if (ov.unlocked) setCandidates(await reviewApi.list());
  }

  useEffect(() => {
    void reload();
  }, []);

  if (openId) {
    return <ReviewScreen id={openId} onBack={() => { setOpenId(null); void reload(); }} />;
  }

  if (!overview) {
    return (
      <div className="wrap muted" style={{ padding: '60px 0' }}>
        Loading…
      </div>
    );
  }

  if (!overview.unlocked) {
    return (
      <div className="page">
        <div className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>
          <div className="page-head" style={{ paddingTop: 0 }}>
            <div>
              <div className="eyebrow">Reviewer · Nomination &amp; Governance Committee</div>
              <h1>Candidate review console</h1>
            </div>
          </div>
          <div className="locked-banner">
            <div className="lb-ic">
              <Lock size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 17, marginBottom: 5 }}>Review opens after the application window closes</h3>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.72)', lineHeight: 1.55, maxWidth: 560 }}>
                In line with the URS, reviewers may access applications only after the submission period ends or
                once all applications are in. The window closes {fmtDate(overview.closeAt)}.
              </p>
            </div>
          </div>
          <div
            style={{
              marginTop: 24,
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 14,
              opacity: 0.6,
              pointerEvents: 'none',
              filter: 'grayscale(.4)',
            }}
          >
            <Stat icon={<Users size={20} />} value={overview.received} label="Applications received" />
            <Stat icon={<Clock size={20} />} value="—" label="Awaiting review" />
            <Stat icon={<Star size={20} />} value="—" label="Shortlisted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="page-head">
          <div>
            <div className="eyebrow">Reviewer · Nomination &amp; Governance Committee</div>
            <h1>Candidate review console</h1>
            <div className="ph-sub">Window closed · {overview.toAssess} applications available for assessment</div>
          </div>
          <button className="btn btn-dark" onClick={() => setShortlistOpen(true)}>
            <List size={17} /> Shortlist report
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          <Stat icon={<Users size={20} />} value={overview.toAssess} label="To assess" accent />
          <Stat icon={<CheckCircle2 size={20} />} value={overview.reviewedByMe} label="Reviewed by you" />
          <Stat icon={<Star size={20} />} value={overview.shortlisted} label="Shortlisted" />
          <Stat icon={<Scale size={20} />} value={overview.criteriaCount} label="Scoring criteria" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 16 }}>
          {candidates.map((a) => (
            <div
              key={a.id}
              className="card"
              style={{ padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14 }}
              onClick={() => setOpenId(a.id)}
            >
              <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                <Avatar seed={a.reference ?? a.id} initials={`${a.firstName?.[0] ?? ''}${a.lastName?.[0] ?? ''}`} size={46} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{[a.title, a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ')}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{a.role}</div>
                </div>
                {a.flags > 0 && (
                  <span className="flag">
                    <TriangleAlert size={11} /> {a.flags}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {a.expertise.slice(0, 3).map((e) => (
                  <span key={e} className="chip" style={{ fontSize: 11, padding: '3px 9px' }}>
                    {e}
                  </span>
                ))}
              </div>
              <hr className="hr" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {a.myScore != null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span className={`scorepill ${scoreClass(a.myScore)}`} style={{ fontSize: 14, minWidth: 44, padding: '5px 11px' }}>
                      {a.myScore}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Your score</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Clock size={14} /> Not yet reviewed
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--brand-700)' }}>
                  {a.myShortlist && <Star size={14} />} Review <ArrowRight size={15} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {shortlistOpen && <ShortlistModal onClose={() => setShortlistOpen(false)} />}
    </div>
  );
}

function ShortlistModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<ShortlistEntry[] | null>(null);

  useEffect(() => {
    void reviewApi.shortlist().then(setRows);
  }, []);

  function downloadCsv() {
    if (!rows) return;
    const header = ['Reference', 'Name', 'Weighted score', 'Areas of expertise'];
    const lines = rows.map((r) =>
      [r.reference ?? '', r.name, r.weightedScore ?? '', r.expertise.join('; ')]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shortlist-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal
      title="Shortlist report"
      width={620}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" disabled={!rows || rows.length === 0} onClick={downloadCsv}>
            <Download size={15} /> Download CSV
          </button>
        </>
      }
    >
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>
        Candidates you have recommended for shortlist.
      </p>
      {!rows ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">You haven’t recommended any candidates for shortlist yet.</p>
      ) : (
        <div className="table-card">
          <table className="dt">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Reference</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ cursor: 'default' }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{r.expertise.slice(0, 3).join(', ')}</div>
                  </td>
                  <td>
                    <span className="ref-mono">{r.reference}</span>
                  </td>
                  <td>
                    <span className={`scorepill ${scoreClass(r.weightedScore)}`}>{r.weightedScore ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
