import { useEffect, useState } from 'react';
import { ArrowRight, CalendarClock, CheckCircle2, Clock, Download, List, Lock, Mic, Scale, Send, Star, TriangleAlert, Users } from 'lucide-react';
import { reviewApi, type ReviewCandidate, type ReviewOverview, type ShortlistEntry } from '../../lib/review-api';
import { Avatar, Modal, Stat } from '../../components/ui';
import { scoreClass } from '../../lib/constants';
import { fmtDate, fmtDateTime } from '../../lib/format';
import { ReviewScreen } from './ReviewScreen';
import { SubmitAllModal } from './SubmitAllModal';

export function ReviewerConsole() {
  const [overview, setOverview] = useState<ReviewOverview | null>(null);
  const [candidates, setCandidates] = useState<ReviewCandidate[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [submitAllOpen, setSubmitAllOpen] = useState(false);
  const [seg, setSeg] = useState<'all' | 'none' | 'draft' | 'submitted' | 'interview'>('all');

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
              {overview.ended && overview.interviewEndAt && new Date(overview.interviewEndAt).getTime() > Date.now() ? (
                <>
                  <h3 style={{ fontSize: 17, marginBottom: 5 }}>Document Evaluation has closed</h3>
                  <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.72)', lineHeight: 1.55, maxWidth: 560 }}>
                    Stage 1 is complete. The Interview scoring and your final submission open once the interview period
                    ends on <b>{fmtDateTime(overview.interviewEndAt)}</b>.
                  </p>
                </>
              ) : overview.ended ? (
                <>
                  <h3 style={{ fontSize: 17, marginBottom: 5 }}>The review period has ended</h3>
                  <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.72)', lineHeight: 1.55, maxWidth: 560 }}>
                    Reviewers may no longer score or submit assessments — the deadline was{' '}
                    {fmtDate(overview.reviewCloseAt)}. Contact the Company Secretariat if you need it extended.
                  </p>
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: 17, marginBottom: 5 }}>Review opens after the application window closes</h3>
                  <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.72)', lineHeight: 1.55, maxWidth: 560 }}>
                    In line with the URS, reviewers may access applications only after the submission period ends or
                    once all applications are in. The window closes {fmtDate(overview.closeAt)}.
                  </p>
                </>
              )}
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

  // Once only the interview stage is open, the work is just the interview list —
  // everyone else's Document Evaluation window has closed.
  const interviewOnly = overview.interviewOpen && !overview.docOpen;
  const work = interviewOnly ? candidates.filter((c) => c.interviewSelected) : candidates;
  const counts = {
    all: work.length,
    none: work.filter((c) => c.myStatus === 'none').length,
    draft: work.filter((c) => c.myStatus === 'draft').length,
    submitted: work.filter((c) => c.myStatus === 'submitted').length,
    interview: work.filter((c) => c.interviewSelected).length,
  };
  const shown =
    seg === 'all'
      ? work
      : seg === 'interview'
        ? work.filter((c) => c.interviewSelected)
        : work.filter((c) => c.myStatus === seg);
  const SEGMENTS: { key: typeof seg; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'none', label: 'To assess' },
    { key: 'draft', label: 'In progress' },
    { key: 'submitted', label: 'Completed' },
    ...(counts.interview > 0 && !interviewOnly ? [{ key: 'interview' as const, label: 'Interview list' }] : []),
  ];
  const stageLine = overview.interviewOpen
    ? `Stage 2 · Interview scoring open for ${overview.interviewCandidates} interview candidate${overview.interviewCandidates === 1 ? '' : 's'}`
    : `Stage 1 · Document Evaluation${overview.reviewCloseAt ? ` open until ${fmtDateTime(overview.reviewCloseAt)}` : ''}`;

  return (
    <div className="page">
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="page-head">
          <div>
            <div className="eyebrow">Reviewer · Nomination &amp; Governance Committee</div>
            <h1>Candidate review console</h1>
            <div className="ph-sub">
              {stageLine} · {overview.toAssess} applications
            </div>
          </div>
          <button className="btn btn-dark" onClick={() => setShortlistOpen(true)}>
            <List size={17} /> Shortlist report
          </button>
        </div>

        {!overview.interviewOpen && (
          <div className="indep-banner info" style={{ marginBottom: 16, alignItems: 'center', fontSize: 13 }}>
            <CalendarClock size={17} style={{ flex: '0 0 auto' }} />
            <span>
              Submit the <b>Document Evaluation (50%)</b> for each candidate now. The <b>Interview (50%)</b> part and
              your final submission open{' '}
              {overview.interviewEndAt ? (
                <>
                  after the interview period ends on <b>{fmtDateTime(overview.interviewEndAt)}</b>
                </>
              ) : (
                'after the interview period (the Secretariat will set the dates)'
              )}
              , for candidates invited to interview.
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
          <Stat icon={<Clock size={20} />} value={counts.none} label="To assess (not reviewed)" accent />
          <Stat icon={<Scale size={20} />} value={counts.draft} label="In progress (draft)" />
          <Stat icon={<CheckCircle2 size={20} />} value={counts.submitted} label="Completed by you" />
          <Stat icon={<Star size={20} />} value={overview.shortlisted} label="Shortlisted by you" />
        </div>

        {/* Segregation: filter candidates by your review state */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          {SEGMENTS.map((s) => (
            <span
              key={s.key}
              className={`chip-toggle${seg === s.key ? ' on' : ''}`}
              onClick={() => setSeg(s.key)}
              style={{ cursor: 'pointer' }}
            >
              {s.label} · {counts[s.key]}
            </span>
          ))}
          {counts.draft > 0 && (
            <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setSubmitAllOpen(true)}>
              <Send size={15} /> Submit all in progress ({counts.draft})
            </button>
          )}
        </div>

        {shown.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>
            {seg === 'none'
              ? 'You have started or completed all candidates — none left to assess. 🎉'
              : seg === 'draft'
                ? 'No candidates in progress. Saved drafts will appear here.'
                : seg === 'submitted'
                  ? 'You haven’t completed any assessments yet.'
                  : seg === 'interview'
                    ? 'No candidates are on the interview list yet.'
                    : 'No candidates available.'}
          </div>
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 16 }}>
          {shown.map((a) => (
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
                {a.myFinalSubmitted ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span className={`scorepill ${scoreClass(a.myScore)}`} style={{ fontSize: 14, minWidth: 44, padding: '5px 11px' }}>
                      {a.myScore}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle2 size={13} /> Final submitted
                    </span>
                  </div>
                ) : a.stage === 'interview' && a.myStatus === 'none' ? (
                  <span style={{ fontSize: 12.5, color: 'var(--brand-700)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Mic size={14} /> Interview to score
                    {a.myDocScore != null && <span className="muted" style={{ fontWeight: 600 }}>· doc {a.myDocScore}/50</span>}
                  </span>
                ) : a.myDocSubmitted && a.stage === 'document' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span
                      className={`scorepill ${scoreClass(a.myDocScore == null ? null : a.myDocScore * 2)}`}
                      style={{ fontSize: 13, padding: '5px 10px' }}
                      title="Document Evaluation points out of 50"
                    >
                      {a.myDocScore}/50
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle2 size={13} /> Document submitted
                    </span>
                  </div>
                ) : a.myStatus === 'draft' ? (
                  <span style={{ fontSize: 12.5, color: 'var(--warn)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Scale size={14} /> Draft saved
                  </span>
                ) : (
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Clock size={14} /> Not yet reviewed
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--brand-700)' }}>
                  {a.myShortlist && <Star size={14} />}{' '}
                  {a.interviewSelected && <Mic size={13} />}
                  {a.myStatus === 'submitted' ? 'View' : a.myStatus === 'draft' ? 'Continue' : 'Review'}{' '}
                  <ArrowRight size={15} />
                </span>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
      {shortlistOpen && <ShortlistModal onClose={() => setShortlistOpen(false)} />}
      {submitAllOpen && (
        <SubmitAllModal
          drafts={work.filter((c) => c.myStatus === 'draft')}
          onClose={() => setSubmitAllOpen(false)}
          onDone={() => void reload()}
        />
      )}
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
