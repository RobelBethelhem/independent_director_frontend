import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  Clock,
  Columns3,
  FileText,
  Flag,
  MapPin,
  Rows3,
  ScrollText,
  Search,
  Send,
  ShieldCheck,
  Star,
  Users,
  UsersRound,
} from 'lucide-react';
import { adminApi, type AdminApplicant, type AdminStats } from '../../lib/admin-api';
import { Avatar, Select, Stat } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';
import { fmtDate } from '../../lib/format';
import { scoreClass } from '../../lib/constants';
import { ApplicantDrawer } from './ApplicantDrawer';
import { AdminBoard } from './AdminBoard';
import { ReviewersModal } from './ReviewersModal';
import { AuditorsModal } from './AuditorsModal';
import { RecommendersModal } from './RecommendersModal';

const STATUS_OPTIONS = [
  'All statuses',
  'Submitted',
  'Under Review',
  'Information Requested',
  'Shortlisted',
  'Not Selected',
  'Selected',
];
const STATUS_VALUE: Record<string, string> = {
  'All statuses': 'all',
  Submitted: 'submitted',
  'Under Review': 'under_review',
  'Information Requested': 'info_requested',
  Shortlisted: 'shortlisted',
  'Not Selected': 'not_selected',
  Selected: 'selected',
};
const SORT_OPTIONS = ['Sort: Date submitted', 'Sort: Score', 'Sort: Name'];
const SORT_VALUE: Record<string, string> = {
  'Sort: Date submitted': 'submitted',
  'Sort: Score': 'score',
  'Sort: Name': 'name',
};

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [items, setItems] = useState<AdminApplicant[]>([]);
  const [poolTotal, setPoolTotal] = useState(0);
  const [q, setQ] = useState('');
  const [statusLabel, setStatusLabel] = useState('All statuses');
  const [sortLabel, setSortLabel] = useState('Sort: Date submitted');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'table' | 'board'>('board');
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewersOpen, setReviewersOpen] = useState(false);
  const [auditorsOpen, setAuditorsOpen] = useState(false);
  const [recommendersOpen, setRecommendersOpen] = useState(false);

  async function reload() {
    const [s, list] = await Promise.all([
      adminApi.stats(),
      adminApi.list({ query: q, status: STATUS_VALUE[statusLabel], sort: SORT_VALUE[sortLabel] }),
    ]);
    setStats(s);
    setItems(list.items);
    setPoolTotal(list.poolTotal);
  }

  /** Refresh everything after a status change (stats + table + Kanban board). */
  function refresh() {
    void reload();
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusLabel, sortLabel]);

  return (
    <div className="page">
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="page-head">
          <div>
            <div className="eyebrow">Administrator · Company Secretariat</div>
            <h1>Applications dashboard</h1>
            <div className="ph-sub">Independent Director recruitment 2026</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setReviewersOpen(true)}>
              <UsersRound size={17} /> Reviewers
            </button>
            <button className="btn btn-ghost" onClick={() => setAuditorsOpen(true)}>
              <ShieldCheck size={17} /> Auditors
            </button>
            <button className="btn btn-ghost" onClick={() => setRecommendersOpen(true)}>
              <Send size={17} /> Recommenders
            </button>
            <Link className="btn btn-ghost" to="/audit">
              <ScrollText size={17} /> Audit trail
            </Link>
            <Link className="btn btn-ghost" to="/admin/search">
              <Search size={17} /> Advanced search
            </Link>
            <Link className="btn btn-dark" to="/admin/reports">
              <BarChart3 size={17} /> Reports
            </Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 24 }}>
          <Stat icon={<Users size={20} />} value={stats?.total ?? '—'} label="Total applicants" accent />
          <Stat icon={<FileText size={20} />} value={stats?.submitted ?? '—'} label="Submitted" />
          <Stat icon={<Clock size={20} />} value={stats?.review ?? '—'} label="Under review" />
          <Stat icon={<Star size={20} />} value={stats?.short ?? '—'} label="Shortlisted" />
          <Stat icon={<Flag size={20} />} value={stats?.flags ?? '—'} label="Independence flags" />
        </div>

        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div className="searchbox">
            <Search size={17} />
            <input
              className="inp"
              placeholder="Search name, reference, country…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {view === 'table' && (
            <>
              <Select
                value={statusLabel}
                onChange={(e) => setStatusLabel(e.target.value)}
                options={STATUS_OPTIONS}
                style={{ maxWidth: 190 }}
              />
              <Select
                value={sortLabel}
                onChange={(e) => setSortLabel(e.target.value)}
                options={SORT_OPTIONS}
                style={{ maxWidth: 200 }}
              />
            </>
          )}
          <div style={{ flex: 1 }} />
          {view === 'table' && (
            <span className="muted" style={{ fontSize: 13 }}>
              {items.length} of {poolTotal}
            </span>
          )}
          <div className="viewseg" role="tablist" title="Switch view">
            <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>
              <Columns3 size={15} /> Board
            </button>
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
              <Rows3 size={15} /> Table
            </button>
          </div>
        </div>

        {view === 'board' ? (
          <AdminBoard query={q} refreshKey={refreshKey} onOpen={(id) => setSelectedId(id)} onChanged={refresh} />
        ) : (
        <div className="table-card">
          <table className="dt">
            <thead>
              <tr>
                {['Applicant', 'Reference', 'Country', 'Expertise', 'Submitted', 'Score', 'Status', ''].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} onClick={() => setSelectedId(a.id)}>
                  <td>
                    <div className="cell-name">
                      <Avatar seed={a.reference ?? a.id} initials={`${a.firstName?.[0] ?? ''}${a.lastName?.[0] ?? ''}`} />
                      <div>
                        <div className="nm">
                          {[a.title, a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ')}
                          {a.flags > 0 && (
                            <span className="flag" style={{ marginLeft: 8 }}>
                              <Flag size={11} /> {a.flags}
                            </span>
                          )}
                        </div>
                        <div className="sub">{a.role}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="ref-mono">{a.reference}</span>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      <MapPin size={14} style={{ color: 'var(--ink-3)' }} /> {a.country}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
                      {a.expertise.slice(0, 2).join(', ')}
                      {a.expertise.length > 2 ? ` +${a.expertise.length - 2}` : ''}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 13 }}>{fmtDate(a.submittedAt)}</span>
                  </td>
                  <td>
                    <span className={`scorepill ${scoreClass(a.score)}`}>{a.score == null ? '—' : a.score}</span>
                  </td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td>
                    <ChevronRight size={17} style={{ color: 'var(--ink-4)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>
              No applications match your filters.
            </div>
          )}
        </div>
        )}
      </div>

      {selectedId && (
        <ApplicantDrawer id={selectedId} onClose={() => setSelectedId(null)} onChanged={refresh} />
      )}
      {reviewersOpen && <ReviewersModal onClose={() => setReviewersOpen(false)} />}
      {auditorsOpen && <AuditorsModal onClose={() => setAuditorsOpen(false)} />}
      {recommendersOpen && <RecommendersModal onClose={() => setRecommendersOpen(false)} />}
    </div>
  );
}
