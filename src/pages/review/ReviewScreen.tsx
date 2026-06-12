import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Check,
  Lock,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { reviewApi, type ReviewDossier } from '../../lib/review-api';
import { Avatar, Field, Textarea } from '../../components/ui';
import { DocumentPreview } from '../../components/DocumentPreview';
import { SubmitConfirmModal } from '../../components/SubmitConfirmModal';
import { GroupedDocs } from '../../components/GroupedDocs';
import { CRITERIA, CRITERIA_GROUPS, DECLARATIONS, SCORE_MAX } from '../../lib/constants';
import { fmtDate, fmtPeriod } from '../../lib/format';

interface Suggestion {
  value: number;
  rationale: string;
}

function computeScore(values: Record<string, number>): number {
  let total = 0;
  for (const c of CRITERIA) total += ((values[c.id] || 0) / SCORE_MAX) * c.weight;
  return Math.round(total);
}

const fullName = (a: ReviewDossier) => [a.title, a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ');

/** Uppercase divider heading used inside the dossier. */
function DBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '4px 0 11px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function ReviewScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const [a, setA] = useState<ReviewDossier | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [shortlist, setShortlist] = useState(false);
  const [tab, setTab] = useState<'score' | 'dossier' | 'docs' | 'decl'>('score');
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    void reviewApi.dossier(id).then((d) => {
      setA(d);
      setValues(d.myScores ?? {});
      setComment(d.myReview.comment ?? '');
      setShortlist(d.myReview.shortlistRecommended);
      // Only fetch smart suggestions while the assessment is still editable.
      if (!d.myReview.submitted) {
        void reviewApi.suggestedScores(id).then((rows) => {
          const map: Record<string, Suggestion> = {};
          for (const r of rows) map[r.criterionId] = { value: r.value, rationale: r.rationale };
          setSuggestions(map);
        });
      }
    });
  }, [id]);

  if (!a) {
    return (
      <div className="wrap muted" style={{ padding: '60px 0' }}>
        Loading…
      </div>
    );
  }

  const live = computeScore(values);
  const allScored = CRITERIA.every((c) => values[c.id]);
  const scoredCount = CRITERIA.filter((c) => values[c.id]).length;
  const locked = a.myReview.submitted; // submitted assessments are view-only
  const hasSuggestions = Object.keys(suggestions).length > 0;

  function applySuggestions() {
    if (locked) return;
    setValues((v) => {
      const next = { ...v };
      for (const [id_, s] of Object.entries(suggestions)) next[id_] = s.value;
      return next;
    });
  }

  async function save(submit: boolean) {
    setSaving(true);
    try {
      await reviewApi.putScores(id, CRITERIA.filter((c) => values[c.id]).map((c) => ({ criterionId: c.id, value: values[c.id] })));
      await reviewApi.putReview(id, { comment, shortlistRecommended: shortlist, submitted: submit });
      if (submit) onBack();
    } finally {
      setSaving(false);
    }
  }

  const declById = new Map(a.declarations.map((d) => [d.itemId, d]));

  return (
    <div className="page">
      {previewId && (
        <DocumentPreview
          loadPreview={() => reviewApi.preview(a.id, previewId)}
          loadDownload={() => reviewApi.download(a.id, previewId)}
          onClose={() => setPreviewId(null)}
        />
      )}
      {confirmOpen && (
        <SubmitConfirmModal
          title="Reviewer Declaration"
          confirmLabel="Submit assessment"
          busy={saving}
          onConfirm={() => void save(true)}
          onClose={() => setConfirmOpen(false)}
          declaration={
            <>
              <p style={{ marginTop: 0 }}>
                I, the undersigned, hereby declare that I have reviewed the application of{' '}
                <b>{fullName(a) || a.reference}</b> in my capacity as <b>Reviewer</b>.
              </p>
              <p>
                I confirm that I have conducted the review objectively, independently, and to the best of my
                professional knowledge and judgment. I further declare that:
              </p>
              <ul style={{ margin: '0 0 0 2px', paddingLeft: 18, lineHeight: 1.7 }}>
                <li>I have no conflict of interest that could influence my review of this application.</li>
                <li>My comments, recommendations, and/or approvals are based solely on professional assessment.</li>
                <li>
                  I understand that my review contributes to the quality assurance and governance process of Zemen
                  Bank S.C.
                </li>
              </ul>
            </>
          }
        />
      )}
      <div className="wrap" style={{ paddingTop: 24, paddingBottom: 60 }}>
        <button className="btn btn-link" style={{ padding: '4px 0', marginBottom: 14 }} onClick={onBack}>
          <ArrowLeft size={15} /> Back to all candidates
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 26, alignItems: 'start' }}>
          {/* Left: dossier */}
          <div>
            <div className="card card-pad">
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 4 }}>
                <Avatar seed={a.reference ?? a.id} initials={`${a.firstName?.[0] ?? ''}${a.lastName?.[0] ?? ''}`} size={58} />
                <div style={{ flex: 1 }}>
                  <h1 className="serif" style={{ fontSize: 25 }}>
                    {fullName(a)}
                  </h1>
                  <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 3 }}>{a.role}</div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--ink-3)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={14} /> {[a.city, a.country].filter(Boolean).join(', ') || '—'}
                    </span>
                    {a.years != null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Briefcase size={14} /> {a.years} yrs experience
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} /> {a.boards} boards
                    </span>
                    <span className="ref-mono">{a.reference}</span>
                  </div>
                </div>
                {a.flags > 0 && (
                  <span className="flag">
                    <TriangleAlert size={11} /> {a.flags} flag{a.flags > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {a.recommendation && (
                <div className="indep-banner info" style={{ alignItems: 'flex-start', marginTop: 16, marginBottom: 0 }}>
                  <BadgeCheck size={18} style={{ flex: '0 0 auto', marginTop: 1 }} />
                  <div style={{ fontWeight: 500, fontSize: 13 }}>
                    Recommended by <b>{a.recommendation.recommendedBy}</b>
                    {a.recommendation.message && (
                      <div style={{ marginTop: 5, fontStyle: 'italic', color: 'var(--ink-2)' }}>
                        “{a.recommendation.message}”
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="tabs" style={{ marginTop: 18, marginBottom: 18 }}>
                {([
                  ['score', 'Assessment'],
                  ['dossier', 'Dossier'],
                  ['docs', 'Documents'],
                  ['decl', 'Declarations'],
                ] as const).map(([k, l]) => (
                  <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
                    {l}
                  </button>
                ))}
              </div>

              {tab === 'score' && (
                <div className="fade-in">
                  {locked ? (
                    <div className="indep-banner" style={{ background: 'var(--paper-2)', color: 'var(--ink-2)' }}>
                      <Lock size={18} /> You have submitted this assessment. Your scores are final and shown
                      read-only.
                    </div>
                  ) : (
                    <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 12, lineHeight: 1.5 }}>
                      Score each criterion from 1 to 10 per the NRC scoring guide. The weighted total updates
                      automatically.
                    </p>
                  )}

                  {!locked && hasSuggestions && (
                    <div className="suggest-banner">
                      <Sparkles size={17} />
                      <div style={{ flex: 1 }}>
                        <b>Smart evaluator</b> proposed scores for the document criteria from the application.
                        You can apply and then adjust them.
                      </div>
                      <button className="btn btn-dark btn-sm" type="button" onClick={applySuggestions}>
                        Apply suggestions
                      </button>
                    </div>
                  )}

                  {CRITERIA_GROUPS.map((group) => (
                    <div key={group.key} style={{ marginBottom: 8 }}>
                      <div className="rubric-group-h">{group.label}</div>
                      {CRITERIA.filter((c) => c.group === group.key).map((c) => {
                        const sug = suggestions[c.id];
                        return (
                          <div key={c.id} className="score-row">
                            <div className="score-crit">
                              {c.label}
                              <div className="w">
                                Weight {c.weight}%
                                {!locked && sug && (
                                  <span className="suggest-hint" title={sug.rationale}>
                                    {' · '}
                                    <Sparkles size={11} /> suggests {sug.value}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="score-dots">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                <button
                                  key={n}
                                  className={`score-dot${(values[c.id] || 0) >= n ? ' on' : ''}`}
                                  disabled={locked}
                                  onClick={() => setValues({ ...values, [c.id]: n })}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                            <div className="score-val">{values[c.id] ? ((values[c.id] / SCORE_MAX) * c.weight).toFixed(1) : '—'}</div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {tab === 'dossier' && (
                <div className="fade-in">
                  <DBlock title="Personal">
                    <dl className="kv">
                      <dt>Name</dt>
                      <dd>{fullName(a) || '—'}</dd>
                      <dt>Date of birth</dt>
                      <dd>{a.dob ? fmtDate(a.dob) : '—'}</dd>
                      <dt>Gender</dt>
                      <dd>{a.gender || '—'}</dd>
                      <dt>Nationality</dt>
                      <dd>{a.nationality || '—'}</dd>
                      <dt>Residence</dt>
                      <dd>{[a.city, a.country].filter(Boolean).join(', ') || '—'}</dd>
                    </dl>
                  </DBlock>

                  <DBlock title="Areas of expertise">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {a.expertise.length ? a.expertise.map((e) => <span key={e} className="chip">{e}</span>) : <span className="muted">—</span>}
                    </div>
                  </DBlock>

                  <DBlock title="Education">
                    {a.education.filter((e) => e.degree || e.institution).length === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      <dl className="kv">
                        {a.education.filter((e) => e.degree || e.institution).map((e, i) => (
                          <div key={i} style={{ display: 'contents' }}>
                            <dt>{e.degree || '—'}</dt>
                            <dd>{[e.field, e.institution, e.year].filter(Boolean).join(' · ') || '—'}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </DBlock>

                  <DBlock title="Professional qualifications">
                    {a.professionalQuals.filter((q) => q.name).length === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      <dl className="kv">
                        {a.professionalQuals.filter((q) => q.name).map((q, i) => (
                          <div key={i} style={{ display: 'contents' }}>
                            <dt>{q.name}</dt>
                            <dd>{[q.body, q.year].filter(Boolean).join(' · ') || '—'}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </DBlock>

                  <DBlock title="Employment history">
                    {a.employment.filter((e) => e.org || e.role).length === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      a.employment.filter((e) => e.org || e.role).map((e, i) => (
                        <div key={i} className="entry" style={{ marginBottom: 10 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{[e.role, e.org].filter(Boolean).join(' · ')}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                            {[e.fromMonth, e.isCurrent ? 'Present' : e.toMonth].filter(Boolean).join(' – ') || '—'}
                          </div>
                          {e.summary && <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 7, lineHeight: 1.5 }}>{e.summary}</div>}
                        </div>
                      ))
                    )}
                  </DBlock>

                  <DBlock title="Board appointments">
                    {a.boardEntries.filter((b) => b.org).length === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      <dl className="kv">
                        {a.boardEntries.filter((b) => b.org).map((b, i) => (
                          <div key={i} style={{ display: 'contents' }}>
                            <dt>{b.org}</dt>
                            <dd>{[b.position, b.type, fmtPeriod(b)].filter(Boolean).join(' · ') || '—'}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </DBlock>

                  <DBlock title="References">
                    {a.references.filter((r) => r.name).length === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      <dl className="kv">
                        {a.references.filter((r) => r.name).map((r, i) => (
                          <div key={i} style={{ display: 'contents' }}>
                            <dt>{r.name}</dt>
                            <dd>
                              {r.positionOrg || '—'}
                              {r.relationship && (
                                <span className="muted"> · {r.relationship}</span>
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </DBlock>

                  <DBlock title="Conflict of interest disclosure">
                    <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>{a.conflictsText || 'None stated.'}</p>
                  </DBlock>
                </div>
              )}

              {tab === 'docs' && (
                <div className="fade-in">
                  <GroupedDocs documents={a.documents} onPreview={setPreviewId} />
                </div>
              )}

              {tab === 'decl' && (
                <div className="fade-in">
                  {a.flags > 0 ? (
                    <div className="indep-banner flag" style={{ marginBottom: 16 }}>
                      <TriangleAlert size={18} /> {a.flags} item(s) flagged.
                    </div>
                  ) : (
                    <div className="indep-banner clear" style={{ marginBottom: 16 }}>
                      <ShieldCheck size={18} /> No independence concerns indicated.
                    </div>
                  )}
                  {DECLARATIONS.flatMap((g) => g.items).map((it) => {
                    const yes = declById.get(it.id)?.answer === 'yes';
                    return (
                      <div key={it.id} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                        <span className={`badge ${yes ? 'badge-info' : 'badge-short'}`} style={{ flex: '0 0 auto' }}>
                          {yes ? 'Yes' : 'No'}
                        </span>
                        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>{it.q}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: scoring panel */}
          <div style={{ position: 'sticky', top: 90 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '22px 22px 20px', background: 'var(--ink)', color: '#fff', textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', fontWeight: 700 }}>
                  Weighted score
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 56, fontWeight: 600, lineHeight: 1, margin: '8px 0 2px' }}>
                  {live}
                  <span style={{ fontSize: 22, color: 'rgba(255,255,255,.5)' }}>/100</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.6)' }}>
                  {locked ? 'Submitted · final' : allScored ? 'All criteria scored' : `${scoredCount} of ${CRITERIA.length} scored`}
                </div>
              </div>
              <div style={{ padding: 20 }}>
                <label
                  onClick={() => !locked && setShortlist(!shortlist)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: '12px 14px',
                    border: `1.4px solid ${shortlist ? 'var(--brand)' : 'var(--line-2)'}`,
                    borderRadius: 10,
                    cursor: locked ? 'default' : 'pointer',
                    background: shortlist ? 'var(--brand-tint)' : 'var(--surface)',
                    marginBottom: 16,
                    opacity: locked && !shortlist ? 0.7 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: shortlist ? 'var(--brand)' : 'var(--surface)',
                      border: `1.5px solid ${shortlist ? 'var(--brand)' : 'var(--line-2)'}`,
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      flex: '0 0 auto',
                    }}
                  >
                    {shortlist && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>Recommend for shortlist</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Flag this candidate to the Committee</div>
                  </div>
                </label>
                <Field label="Reviewer comments">
                  <Textarea
                    value={comment}
                    rows={5}
                    readOnly={locked}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={locked ? '—' : 'Record your assessment, strengths, and any concerns…'}
                  />
                </Field>
                {locked ? (
                  <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 13, justifyContent: 'center' }}>
                    <Lock size={14} /> Assessment submitted — locked.
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} disabled={saving} onClick={() => void save(false)}>
                      <Save size={16} /> Save draft
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1.4 }} disabled={!allScored || saving} onClick={() => setConfirmOpen(true)}>
                      <Check size={16} /> Submit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
