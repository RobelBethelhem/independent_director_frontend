import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Award, BarChart3, Flag, RefreshCw, ShieldCheck, TrendingUp, Users,
} from 'lucide-react';
import { adminApi, type ReportData } from '../../lib/admin-api';
import { Stat } from '../../components/ui';
import { ChartCard, BarList, VBars, Donut, Funnel, PALETTE } from '../../components/charts';
import { CRITERIA, DECLARATIONS } from '../../lib/constants';
import { fmtDate } from '../../lib/format';

const CRIT_LABEL: Record<string, string> = Object.fromEntries(CRITERIA.map((c) => [c.id, c.label]));
const DECL_LABEL: Record<string, string> = Object.fromEntries(
  DECLARATIONS.flatMap((g) => g.items).map((i) => [i.id, i.q]),
);

const shortDate = (d: string) => {
  const dt = new Date(`${d}T00:00:00`);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export function AdminReports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setData(await adminApi.reports());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  if (loading || !data) {
    return (
      <div className="page">
        <div className="wrap" style={{ padding: '60px 0' }} >
          <p className="muted">Loading analytics…</p>
        </div>
      </div>
    );
  }

  const k = data.kpis;
  const cov = data.reviewCoverage;

  return (
    <div className="page">
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <div className="page-head">
          <div>
            <Link to="/admin" className="btn btn-link" style={{ padding: 0, marginBottom: 8 }}>
              <ArrowLeft size={15} /> Back to dashboard
            </Link>
            <div className="eyebrow">Administrator · Analytics</div>
            <h1>Reports &amp; analytics</h1>
            <div className="ph-sub">Independent Director recruitment 2026 — full pool of {k.total} applicants</div>
          </div>
          <button className="btn btn-ghost" onClick={() => void load()}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 24 }}>
          <Stat icon={<Users size={20} />} value={k.total} label="Total applicants" accent />
          <Stat icon={<Award size={20} />} value={k.avgScore ?? '—'} label="Average score" />
          <Stat icon={<ShieldCheck size={20} />} value={k.shortlisted + k.selected} label="Shortlisted / selected" />
          <Stat icon={<TrendingUp size={20} />} value={`${k.reviewedPct}%`} label="Fully reviewed" />
          <Stat icon={<BarChart3 size={20} />} value={`${k.reviewersActive}/${k.reviewerCount}`} label="Reviewers active" />
          <Stat icon={<Flag size={20} />} value={k.withFlags} label="With flags" />
        </div>

        <div className="reports-grid">
          <ChartCard title="Recruitment funnel" subtitle="Stage-to-stage progression" span={2}>
            <Funnel stages={data.funnel} />
          </ChartCard>

          <ChartCard title="Submissions over time" subtitle="Applications submitted per day" span={2}>
            <VBars data={data.submissionsByDay.map((d) => ({ label: shortDate(d.date), value: d.count }))} color="#2B6CB0" />
          </ChartCard>

          <ChartCard title="Status breakdown" subtitle="Where the pool sits now">
            <BarList
              data={data.statusBreakdown.map((s) => ({ label: s.key, value: s.count }))}
              color={(_d, i) => PALETTE[i % PALETTE.length]}
            />
          </ChartCard>

          <ChartCard title="Score distribution" subtitle="Aggregate review scores">
            <VBars data={data.scoreDistribution.map((s) => ({ label: s.label, value: s.count }))} color="#1E7F4F" />
          </ChartCard>

          <ChartCard title="Average score by criterion" subtitle="NRC rubric — out of 10 (submitted reviews)" span={2}>
            <BarList
              data={data.criteriaAverages.map((c) => ({
                label: `${CRIT_LABEL[c.criterionId] ?? c.criterionId} · ${c.weight}%`,
                value: c.average ?? 0,
              }))}
              max={10}
              color="#5A4FCF"
            />
          </ChartCard>

          <ChartCard title="Review coverage" subtitle={`${cov.reviewerCount} reviewers in the committee`}>
            <Donut
              segments={[
                { label: 'Fully reviewed', value: cov.fully, color: '#1E7F4F' },
                { label: 'Partially', value: cov.partial, color: '#B8860B' },
                { label: 'Not reviewed', value: cov.unreviewed, color: 'var(--ink-4)' },
              ]}
            />
          </ChartCard>

          <ChartCard title="Gender" subtitle="Diversity of the pool">
            <Donut
              segments={data.gender.map((g, i) => ({ label: g.key, value: g.count, color: PALETTE[i % PALETTE.length] }))}
            />
          </ChartCard>

          <ChartCard title="Expertise coverage" subtitle="Board competencies across the pool">
            <BarList data={data.expertise.map((e) => ({ label: e.key, value: e.count }))} color="#0F766E" />
          </ChartCard>

          <ChartCard title="Top countries" subtitle="Country of residence">
            <BarList data={data.countries.map((c) => ({ label: c.key, value: c.count }))} color="#2B6CB0" />
          </ChartCard>

          <ChartCard title="Highest qualification" subtitle="Degree level attained">
            <BarList data={data.degrees.map((d) => ({ label: d.key, value: d.count }))} color="#9333EA" />
          </ChartCard>

          <ChartCard title="Professional experience" subtitle="Years in relevant fields">
            <VBars data={data.experienceBuckets.map((b) => ({ label: b.label, value: b.count }))} color="#C2410C" />
          </ChartCard>

          <ChartCard title="Eligibility (§4.1)" subtitle={`Against ${data.eligibility.total} applicants`}>
            <BarList
              data={[
                { label: "Master's+ (§4.1.1)", value: data.eligibility.meetsMsc },
                { label: '10+ yrs (§4.1.2)', value: data.eligibility.meets10yr },
                { label: 'Meets both', value: data.eligibility.meetsBoth },
              ]}
              max={data.eligibility.total}
              color="#1E7F4F"
            />
          </ChartCard>

          <ChartCard title="Independence flags" subtitle="Declarations answered “Yes”">
            {data.flagsBreakdown.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>No flags raised across the pool.</div>
            ) : (
              <BarList
                data={data.flagsBreakdown.map((f) => ({
                  label: (DECL_LABEL[f.itemId] ?? f.itemId).slice(0, 46) + ((DECL_LABEL[f.itemId]?.length ?? 0) > 46 ? '…' : ''),
                  value: f.count,
                }))}
                color="#7E0E12"
              />
            )}
          </ChartCard>

          <ChartCard title="Reviewer progress" subtitle="Assessments submitted per reviewer" span={2}>
            <div className="table-card" style={{ border: 'none' }}>
              <table className="dt">
                <thead>
                  <tr>
                    <th>Reviewer</th>
                    <th>Submitted</th>
                    <th>Avg score given</th>
                    <th>Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reviewerProgress.map((r) => (
                    <tr key={r.id} style={{ cursor: 'default' }}>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td>
                        {r.submitted} / {r.assigned}
                        <div className="bartrack" style={{ marginTop: 4, width: 120 }}>
                          <div
                            className="barfill"
                            style={{ width: `${r.assigned ? (r.submitted / r.assigned) * 100 : 0}%`, background: 'var(--brand)' }}
                          />
                        </div>
                      </td>
                      <td>{r.avgScore ?? '—'}</td>
                      <td>{r.lastLoginAt ? fmtDate(r.lastLoginAt) : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
