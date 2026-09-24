import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, FileSpreadsheet, MessageSquareText, RotateCw, Send, TriangleAlert, UserMinus, UserPlus } from 'lucide-react';
import { adminApi, type InterviewRanking, type InterviewRankRow, type InviteResult } from '../../lib/admin-api';
import { HttpError } from '../../lib/api';
import { Input, Modal, Textarea } from '../../components/ui';
import { scoreClass } from '../../lib/constants';
import { fmtDateTime } from '../../lib/format';

type Filter = 'all' | 'listed' | 'notlisted' | 'failed';

/** Pending confirmation for an outward action (SMS goes to real phones). */
type Confirm = { kind: 'send'; ids: string[] } | { kind: 'mark'; ids: string[] } | { kind: 'unmark'; ids: string[] };

function defaultDraft(r: InterviewRanking | null): string {
  const when =
    r?.interviewStartAt && r?.interviewEndAt
      ? ` between ${fmtDateTime(r.interviewStartAt)} and ${fmtDateTime(r.interviewEndAt)}`
      : '';
  return (
    `Dear {name}, Zemen Bank is pleased to invite you to an interview for the Independent Director position${when}. ` +
    'The Secretariat will contact you with your exact time. Ref: {reference}'
  );
}

const render = (tpl: string, row: InterviewRankRow) =>
  tpl.replace(/\{name\}/gi, row.name).replace(/\{reference\}/gi, row.reference ?? '');

/**
 * Interview round: rank every applicant by their average Document Evaluation
 * score, pick the Top N (or any mix, in as many rounds as needed), and send
 * the interview-invitation SMS — in bulk or one at a time — with a clear
 * per-recipient outcome so failures can be resent.
 */
export function InterviewModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<InterviewRanking | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [topN, setTopN] = useState('15');
  const [filter, setFilter] = useState<Filter>('all');
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  async function load(keepDraft = true) {
    const r = await adminApi.interviewRanking();
    setData(r);
    if (!keepDraft) setDraft(defaultDraft(r));
  }
  useEffect(() => {
    void load(false);
  }, []);

  const rows = data?.items ?? [];
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const shown = rows.filter((r) =>
    filter === 'listed'
      ? r.interviewSelected
      : filter === 'notlisted'
        ? !r.interviewSelected
        : filter === 'failed'
          ? r.inviteStatus === 'failed'
          : true,
  );
  const counts = {
    all: rows.length,
    listed: rows.filter((r) => r.interviewSelected).length,
    notlisted: rows.filter((r) => !r.interviewSelected).length,
    failed: rows.filter((r) => r.inviteStatus === 'failed').length,
  };
  const selIds = Array.from(selected);
  const firstSel = selIds.length ? byId.get(selIds[0]) : undefined;
  const preview = firstSel ? render(draft, firstSel) : render(draft, { name: 'Dr. Abebe Kebede', reference: 'ZB-IDR-2026-0001' } as InterviewRankRow);
  const scoredCount = rows.filter((r) => r.docScore != null).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Select the top N ranked applicants by average document score. */
  function selectTop() {
    const n = Math.max(0, Math.floor(Number(topN) || 0));
    setSelected(new Set(rows.filter((r) => r.rank != null && r.rank <= n).map((r) => r.id)));
    setFilter('all');
  }

  async function run(c: Confirm) {
    setBusy(true);
    setError(null);
    try {
      if (c.kind === 'send') {
        const res = await adminApi.interviewInvite(c.ids, draft);
        setResult(res);
        // Keep the failed ones selected so "Resend" is one click away.
        setSelected(new Set(res.failed.map((f) => f.id)));
      } else {
        await adminApi.interviewSelection(c.ids, c.kind === 'mark');
        setSelected(new Set());
      }
      setConfirm(null);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const draftOk = draft.trim().length >= 5 && draft.length <= 640;

  const footer = confirm ? (
    <>
      <span style={{ marginRight: 'auto', fontSize: 13.5, fontWeight: 600 }}>
        {confirm.kind === 'send'
          ? `Send the interview SMS to ${confirm.ids.length} applicant${confirm.ids.length === 1 ? '' : 's'}?`
          : confirm.kind === 'mark'
            ? `Put ${confirm.ids.length} applicant${confirm.ids.length === 1 ? '' : 's'} on the interview list without SMS?`
            : `Remove ${confirm.ids.length} applicant${confirm.ids.length === 1 ? '' : 's'} from the interview list?`}
      </span>
      <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirm(null)}>
        Cancel
      </button>
      <button className="btn btn-primary" disabled={busy} onClick={() => void run(confirm)}>
        {busy ? 'Working…' : confirm.kind === 'send' ? 'Yes, send SMS' : 'Yes, continue'}
      </button>
    </>
  ) : (
    <>
      <button
        className="btn btn-ghost"
        style={{ marginRight: 'auto' }}
        disabled={selIds.length === 0 || busy}
        onClick={() => setConfirm({ kind: 'mark', ids: selIds })}
        title="Add to the interview list without texting them (e.g. invited by phone)"
      >
        <UserPlus size={16} /> Add to list without SMS
      </button>
      <button className="btn btn-ghost" onClick={onClose}>
        Close
      </button>
      <button
        className="btn btn-primary"
        disabled={selIds.length === 0 || !draftOk || busy}
        onClick={() => setConfirm({ kind: 'send', ids: selIds })}
      >
        <Send size={16} /> Send SMS to {selIds.length} selected
      </button>
    </>
  );

  return (
    <Modal title="Interview shortlist & invitations" width={1000} onClose={onClose} footer={footer}>
      {!data ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="indep-banner info" style={{ alignItems: 'flex-start', marginBottom: 16, fontSize: 13 }}>
            <CalendarClock size={18} style={{ flex: '0 0 auto', marginTop: 1 }} />
            <span>
              Ranked by each applicant’s <b>average Document Evaluation score (/50)</b> across the {data.reviewerCount}{' '}
              reviewer{data.reviewerCount === 1 ? '' : 's'} who have submitted it ({scoredCount} of {rows.length} scored so
              far).{' '}
              {data.interviewStartAt && data.interviewEndAt ? (
                <>
                  Interview period: <b>{fmtDateTime(data.interviewStartAt)}</b> – <b>{fmtDateTime(data.interviewEndAt)}</b>.
                  Reviewers can score the interview once it ends.
                </>
              ) : (
                <b>Set the interview period in Review settings so reviewers know when interview scoring opens.</b>
              )}
            </span>
          </div>

          {result && (
            <div
              className={`indep-banner ${result.failed.length ? 'flag' : 'clear'}`}
              style={{ display: 'block', marginBottom: 16, fontSize: 13 }}
            >
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                {result.failed.length ? <TriangleAlert size={16} /> : <CheckCircle2 size={16} />}
                SMS sent to {result.sent} of {result.total}.
                {result.failed.length > 0 && ` ${result.failed.length} failed:`}
              </div>
              {result.failed.length > 0 && (
                <>
                  <ul style={{ margin: '8px 0 8px', paddingLeft: 18, fontWeight: 500, lineHeight: 1.7 }}>
                    {result.failed.map((f) => (
                      <li key={f.id}>
                        <b>{f.name}</b> — {f.reason}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="btn btn-dark btn-sm"
                    disabled={busy || !draftOk}
                    onClick={() => setConfirm({ kind: 'send', ids: result.failed.map((f) => f.id) })}
                  >
                    <RotateCw size={14} /> Resend to the {result.failed.length} failed
                  </button>
                </>
              )}
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Everyone attempted is on the interview list, so reviewers can score them either way.
              </div>
            </div>
          )}

          {/* SMS draft */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <MessageSquareText size={15} /> SMS draft
              <span className="muted" style={{ fontWeight: 500, fontSize: 12 }}>
                — <code>{'{name}'}</code> and <code>{'{reference}'}</code> are filled in for each applicant
              </span>
              <button
                type="button"
                className="btn btn-link"
                style={{ marginLeft: 'auto', padding: 0, fontSize: 12 }}
                onClick={() => setDraft(defaultDraft(data))}
              >
                Reset to default
              </button>
            </label>
            <Textarea rows={3} value={draft} invalid={!draftOk} onChange={(e) => setDraft(e.target.value)} />
            <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12 }}>
              <span className="muted" style={{ flex: 1 }}>
                <b>Preview{firstSel ? ` (${firstSel.name})` : ''}:</b> {preview}
              </span>
              <span className={draft.length > 640 ? 'errmsg' : 'muted'} style={{ flex: '0 0 auto' }}>
                {draft.length}/640
              </span>
            </div>
          </div>

          {/* Selection controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Select top</span>
            <Input
              type="number"
              min={1}
              value={topN}
              onChange={(e) => setTopN(e.target.value)}
              style={{ width: 76, height: 34 }}
            />
            <button className="btn btn-dark btn-sm" onClick={selectTop} disabled={scoredCount === 0}>
              Select top {Math.max(0, Math.floor(Number(topN) || 0))}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())} disabled={selIds.length === 0}>
              Clear ({selIds.length})
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={counts.listed === 0}
              onClick={() => void adminApi.exportResults('interview')}
              title="Results sheet for the interview list only"
            >
              <FileSpreadsheet size={14} /> Export list
            </button>
            <div style={{ flex: 1 }} />
            {(
              [
                ['all', 'All'],
                ['listed', 'On interview list'],
                ['notlisted', 'Not on list'],
                ['failed', 'SMS failed'],
              ] as const
            ).map(([k, l]) => (
              <span
                key={k}
                className={`chip-toggle${filter === k ? ' on' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setFilter(k)}
              >
                {l} · {counts[k]}
              </span>
            ))}
          </div>

          {error && <div className="errmsg" style={{ marginBottom: 10 }}>{error}</div>}

          <div className="table-card" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th style={{ width: 34 }}>
                    <input
                      type="checkbox"
                      aria-label="Select all shown"
                      checked={shown.length > 0 && shown.every((r) => selected.has(r.id))}
                      onChange={(e) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          for (const r of shown) {
                            if (e.target.checked) next.add(r.id);
                            else next.delete(r.id);
                          }
                          return next;
                        })
                      }
                    />
                  </th>
                  <th style={{ width: 52 }}>Rank</th>
                  <th>Applicant</th>
                  <th style={{ textAlign: 'center' }}>Doc score</th>
                  <th>Phone</th>
                  <th>Interview</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} style={{ cursor: 'default' }} onClick={() => toggle(r.id)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                    </td>
                    <td style={{ fontWeight: 800 }}>{r.rank ?? '—'}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div className="ref-mono" style={{ fontSize: 11 }}>{r.reference}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.docScore == null ? (
                        <span className="muted" title="No reviewer has submitted the Document Evaluation yet">—</span>
                      ) : (
                        <span title={`Average of ${r.docReviews} reviewer${r.docReviews === 1 ? '' : 's'}`}>
                          <span className={`scorepill ${scoreClass(r.docScore * 2)}`} style={{ padding: '3px 9px' }}>
                            {r.docScore}
                          </span>
                          <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>
                            {r.docReviews}/{data.reviewerCount} rev.
                          </div>
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 12.5 }}>{r.phone || <span className="errmsg" style={{ fontSize: 12 }}>No phone</span>}</td>
                    <td style={{ fontSize: 12.5 }}>
                      {r.inviteStatus === 'sent' ? (
                        <span style={{ color: 'var(--ok)', fontWeight: 700 }}>
                          SMS sent{r.invitedAt ? ` · ${fmtDateTime(r.invitedAt)}` : ''}
                        </span>
                      ) : r.inviteStatus === 'failed' ? (
                        <span style={{ color: 'var(--brand)', fontWeight: 700 }} title={r.inviteError ?? ''}>
                          SMS failed
                          <div style={{ fontWeight: 500, fontSize: 11.5, color: 'var(--ink-3)', maxWidth: 220 }}>{r.inviteError}</div>
                        </span>
                      ) : r.interviewSelected ? (
                        <span style={{ fontWeight: 700 }}>On list (no SMS)</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button
                        className="btn btn-soft btn-sm"
                        disabled={busy || !draftOk || !r.phone}
                        onClick={() => setConfirm({ kind: 'send', ids: [r.id] })}
                        title={r.phone ? 'Send the SMS to this applicant only' : 'No phone number on file'}
                      >
                        <Send size={13} /> {r.inviteStatus ? 'Resend' : 'Send'}
                      </button>
                      {r.interviewSelected && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ marginLeft: 6 }}
                          disabled={busy}
                          onClick={() => setConfirm({ kind: 'unmark', ids: [r.id] })}
                          title="Remove from the interview list"
                        >
                          <UserMinus size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--ink-3)' }}>No applicants in this view.</div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
