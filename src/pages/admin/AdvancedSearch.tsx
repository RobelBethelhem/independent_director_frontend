import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Filter, RotateCcw, Search } from 'lucide-react';
import { adminApi, type SearchFilters, type SearchItem } from '../../lib/admin-api';
import { Field, Input, Select } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import { ApplicantDrawer } from './ApplicantDrawer';
import { COUNTRIES, EXPERTISE } from '../../lib/constants';

const STATUSES = [
  { v: 'submitted', l: 'Submitted' },
  { v: 'under_review', l: 'Under Review' },
  { v: 'info_requested', l: 'Info Requested' },
  { v: 'shortlisted', l: 'Shortlisted' },
  { v: 'not_selected', l: 'Not Selected' },
  { v: 'selected', l: 'Selected' },
];

const DEGREE_MIN = [
  { v: '', l: 'Any degree' },
  { v: '1', l: 'Diploma or higher' },
  { v: '2', l: "Bachelor's or higher" },
  { v: '3', l: "Master's or higher" },
  { v: '4', l: 'Doctorate' },
];

const REVIEW_STATES = [
  { v: '', l: 'Any review state' },
  { v: 'unreviewed', l: 'Not reviewed' },
  { v: 'partial', l: 'Partially reviewed' },
  { v: 'fully', l: 'Fully reviewed' },
];

const num = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v));
const fullName = (a: SearchItem) => [a.title, a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ');

const REVIEW_LABEL: Record<string, string> = { fully: 'Fully', partial: 'Partial', unreviewed: 'Not reviewed' };

export function AdvancedSearch() {
  const [f, setF] = useState<SearchFilters>({ sort: 'submitted' });
  const [items, setItems] = useState<SearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function set<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }
  function toggleArray(key: 'status' | 'expertise', value: string) {
    setF((prev) => {
      const cur = new Set(prev[key] ?? []);
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      return { ...prev, [key]: Array.from(cur) };
    });
  }

  async function run(toPage = 1) {
    setLoading(true);
    setRan(true);
    try {
      const res = await adminApi.search({ ...f, page: toPage });
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
      setPageSize(res.pageSize);
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      await adminApi.exportCsv(f);
    } finally {
      setExporting(false);
    }
  }

  function reset() {
    setF({ sort: 'submitted' });
    setItems([]);
    setTotal(0);
    setRan(false);
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="page">
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="page-head">
          <div>
            <Link to="/admin" className="btn btn-link" style={{ padding: 0, marginBottom: 8 }}>
              <ArrowLeft size={15} /> Back to dashboard
            </Link>
            <div className="eyebrow">Administrator · Advanced search</div>
            <h1>Search &amp; filter applicants</h1>
            <div className="ph-sub">Combine any criteria, then export the matching set</div>
          </div>
          <button className="btn btn-dark" disabled={exporting} onClick={() => void exportCsv()}>
            <Download size={16} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontWeight: 700, fontSize: 13 }}>
            <Filter size={15} /> Filters
          </div>

          {/* Status chips */}
          <div style={{ marginBottom: 14 }}>
            <div className="hint" style={{ marginBottom: 6 }}>Status</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {STATUSES.map((s) => (
                <span
                  key={s.v}
                  className={`chip-toggle${(f.status ?? []).includes(s.v) ? ' on' : ''}`}
                  onClick={() => toggleArray('status', s.v)}
                >
                  {s.l}
                </span>
              ))}
            </div>
          </div>

          <div className="filter-panel">
            <Field label="Search text">
              <Input
                value={f.query ?? ''}
                placeholder="Name, reference, country…"
                onChange={(e) => set('query', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void run(1)}
              />
            </Field>
            <Field label="Min degree">
              <Select
                value={f.degreeMin != null ? String(f.degreeMin) : ''}
                options={DEGREE_MIN.map((d) => d.l)}
                onChange={(e) => {
                  const found = DEGREE_MIN.find((d) => d.l === e.target.value);
                  set('degreeMin', found && found.v ? Number(found.v) : undefined);
                }}
              />
            </Field>
            <Field label="Country">
              <Select
                value={f.country ?? ''}
                placeholder="Any country"
                options={COUNTRIES}
                onChange={(e) => set('country', e.target.value || undefined)}
              />
            </Field>
            <Field label="Gender">
              <Select
                value={f.gender ?? ''}
                placeholder="Any"
                options={['Female', 'Male']}
                onChange={(e) => set('gender', e.target.value || undefined)}
              />
            </Field>

            <Field label="Score min">
              <Input type="number" value={f.scoreMin ?? ''} onChange={(e) => set('scoreMin', num(e.target.value))} placeholder="0" />
            </Field>
            <Field label="Score max">
              <Input type="number" value={f.scoreMax ?? ''} onChange={(e) => set('scoreMax', num(e.target.value))} placeholder="100" />
            </Field>
            <Field label="Experience min (yrs)">
              <Input type="number" value={f.yearsMin ?? ''} onChange={(e) => set('yearsMin', num(e.target.value))} placeholder="0" />
            </Field>
            <Field label="Experience max (yrs)">
              <Input type="number" value={f.yearsMax ?? ''} onChange={(e) => set('yearsMax', num(e.target.value))} placeholder="—" />
            </Field>

            <Field label="Review state">
              <Select
                value={f.reviewState ?? ''}
                options={REVIEW_STATES.map((r) => r.l)}
                onChange={(e) => {
                  const found = REVIEW_STATES.find((r) => r.l === e.target.value);
                  set('reviewState', found && found.v ? found.v : undefined);
                }}
              />
            </Field>
            <Field label="Flags">
              <Select
                value={f.flagged ?? ''}
                placeholder="Any"
                options={['yes', 'no']}
                onChange={(e) => set('flagged', e.target.value || undefined)}
              />
            </Field>
            <Field label="Submitted from">
              <Input type="date" value={f.submittedFrom ?? ''} onChange={(e) => set('submittedFrom', e.target.value || undefined)} />
            </Field>
            <Field label="Submitted to">
              <Input type="date" value={f.submittedTo ?? ''} onChange={(e) => set('submittedTo', e.target.value || undefined)} />
            </Field>
          </div>

          {/* Expertise chips */}
          <div style={{ marginTop: 14 }}>
            <div className="hint" style={{ marginBottom: 6 }}>Areas of expertise (any of)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {EXPERTISE.map((x) => (
                <span
                  key={x}
                  className={`chip-toggle${(f.expertise ?? []).includes(x) ? ' on' : ''}`}
                  onClick={() => toggleArray('expertise', x)}
                >
                  {x}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
            <label className="inline-check" style={{ margin: 0 }}>
              <input type="checkbox" checked={!!f.shortlist} onChange={(e) => set('shortlist', e.target.checked)} />
              Shortlist recommended by a reviewer
            </label>
            <div style={{ flex: 1 }} />
            <div style={{ width: 170 }}>
              <Select
                value={f.sort ?? 'submitted'}
                options={['submitted', 'score', 'name', 'years', 'flags']}
                onChange={(e) => set('sort', e.target.value)}
              />
            </div>
            <button className="btn btn-ghost" onClick={reset}>
              <RotateCcw size={15} /> Reset
            </button>
            <button className="btn btn-primary" disabled={loading} onClick={() => void run(1)}>
              <Search size={16} /> {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>

        {ran && (
          <>
            <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
              {total} matching applicant{total === 1 ? '' : 's'}
            </div>
            <div className="table-card">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Status</th>
                    <th>Country</th>
                    <th>Experience</th>
                    <th>Score</th>
                    <th>Review</th>
                    <th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="muted" style={{ padding: 24 }}>No applicants match these filters.</td>
                    </tr>
                  ) : (
                    items.map((a) => (
                      <tr key={a.id} onClick={() => setSelectedId(a.id)}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{fullName(a) || a.reference}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                            {a.reference} · {a.role}
                          </div>
                        </td>
                        <td><StatusBadge status={a.status} /></td>
                        <td>{a.country ?? '—'}</td>
                        <td>{a.years != null ? `${a.years} yrs` : '—'}</td>
                        <td style={{ fontWeight: 700 }}>{a.score ?? '—'}</td>
                        <td style={{ fontSize: 12 }}>
                          {REVIEW_LABEL[a.reviewState]}
                          {a.shortlist && <span style={{ color: 'var(--ok)', fontWeight: 700 }}> · ★</span>}
                        </td>
                        <td>{a.flags > 0 ? <span style={{ color: 'var(--warn)', fontWeight: 700 }}>{a.flags}</span> : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <div className="muted" style={{ fontSize: 12.5 }}>Page {page} of {pages}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-soft btn-sm" disabled={page <= 1} onClick={() => void run(page - 1)}>
                  <ChevronLeft size={15} /> Prev
                </button>
                <button className="btn btn-soft btn-sm" disabled={page >= pages} onClick={() => void run(page + 1)}>
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedId && (
        <ApplicantDrawer id={selectedId} onClose={() => setSelectedId(null)} onChanged={() => void run(page)} />
      )}
    </div>
  );
}
