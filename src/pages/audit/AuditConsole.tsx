import { Fragment, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, ShieldAlert, Activity, Users, FileSearch } from 'lucide-react';
import { auditApi, type AuditLogRow, type AuditStats } from '../../lib/audit-api';
import { Input, Select, Stat } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';

const ROLE_COLORS: Record<string, string> = {
  applicant: 'var(--ink-3)',
  reviewer: '#2b6cb0',
  admin: '#7e0e12',
  auditor: '#5a4fcf',
};

function RoleChip({ role }: { role: string | null }) {
  if (!role) return <span className="muted">—</span>;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.04em',
        color: ROLE_COLORS[role] ?? 'var(--ink-3)',
      }}
    >
      {role}
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const ok = outcome === 'success';
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        padding: '2px 9px',
        borderRadius: 999,
        background: ok ? 'var(--ok-bg)' : 'var(--err-bg)',
        color: ok ? 'var(--ok)' : 'var(--err)',
      }}
    >
      {ok ? 'Success' : 'Failed'}
    </span>
  );
}

export function AuditConsole() {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState('');
  const [role, setRole] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await auditApi.logs({
        page,
        query: query.trim() || undefined,
        outcome: outcome || undefined,
        actorRole: role || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
      setPageSize(res.pageSize);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void auditApi.stats().then(setStats);
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, outcome, role]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    if (page !== 1) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, role]);

  function applySearch() {
    if (page !== 1) setPage(1);
    else void load();
  }

  function refresh() {
    void auditApi.stats().then(setStats);
    void load();
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="page">
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="page-head">
          <div>
            <div className="eyebrow">Auditor · Compliance &amp; Oversight</div>
            <h1>Audit trail</h1>
            <div className="ph-sub">Every applicant, reviewer and administrator action — append-only</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={refresh}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          <Stat icon={<Activity size={20} />} value={stats?.total ?? '—'} label="Total events" accent />
          <Stat icon={<ShieldAlert size={20} />} value={stats?.failedLogins ?? '—'} label="Failed logins" />
          <Stat icon={<FileSearch size={20} />} value={stats?.last24h ?? '—'} label="Events · last 24h" />
          <Stat icon={<Users size={20} />} value={stats?.distinctActors ?? '—'} label="Distinct actors" />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Input
              value={query}
              placeholder="Search action, email, path, IP, target…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            />
          </div>
          <div style={{ width: 160 }}>
            <Select
              value={outcome}
              options={['success', 'failure']}
              placeholder="All outcomes"
              onChange={(e) => setOutcome(e.target.value)}
            />
          </div>
          <div style={{ width: 160 }}>
            <Select
              value={role}
              options={['applicant', 'reviewer', 'admin', 'auditor']}
              placeholder="All roles"
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <button className="btn btn-soft" onClick={applySearch}>
            Search
          </button>
        </div>

        <div className="table-card">
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: 168 }}>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Outcome</th>
                <th>Target</th>
                <th>Request</th>
                <th>IP address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: 24 }}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: 24 }}>
                    No matching events.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    >
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDateTime(r.createdAt)}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.actorName ?? r.actorEmail ?? 'Anonymous'}</div>
                        <div style={{ fontSize: 11 }}>
                          <RoleChip role={r.actorRole} />
                        </div>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: 12.5 }}>
                          {r.action}
                        </span>
                      </td>
                      <td>
                        <OutcomeBadge outcome={r.outcome} />
                      </td>
                      <td style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                        {r.entityType ? (
                          <>
                            {r.entityType}
                            {r.entityId ? <div className="mono" style={{ fontSize: 10.5 }}>{r.entityId.slice(0, 8)}…</div> : null}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ fontSize: 11.5 }}>
                        {r.method ? (
                          <span>
                            <b>{r.method}</b>
                            {r.statusCode ? <span className="muted"> · {r.statusCode}</span> : null}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {r.ip ?? '—'}
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--surface-2)', fontSize: 12 }}>
                          <div style={{ display: 'grid', gap: 4, padding: '4px 2px' }}>
                            <div>
                              <b>Path:</b> <span className="mono">{r.path ?? '—'}</span>
                            </div>
                            <div>
                              <b>Email:</b> {r.actorEmail ?? '—'}
                            </div>
                            <div>
                              <b>User agent:</b> <span style={{ color: 'var(--ink-2)' }}>{r.userAgent ?? '—'}</span>
                            </div>
                            {r.metadata && Object.keys(r.metadata).length > 0 && (
                              <div>
                                <b>Details:</b>{' '}
                                <span className="mono">{JSON.stringify(r.metadata)}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {total} event{total === 1 ? '' : 's'} · page {page} of {pages}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-soft btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={15} /> Prev
            </button>
            <button className="btn btn-soft btn-sm" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
