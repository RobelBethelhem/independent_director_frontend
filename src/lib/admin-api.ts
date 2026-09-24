import { api, tokenStore, API_BASE } from './api';
import type { ApplicationStatus } from './types';

export interface AdminApplicant {
  id: string;
  reference: string | null;
  status: ApplicationStatus;
  flags: number;
  title: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  country: string | null;
  city: string | null;
  role: string;
  expertise: string[];
  boards: number;
  years: number | null;
  submittedAt: string | null;
  score: number | null;
  /** Per-evaluator FINAL scores (/100) aligned to the committee order (null = no final yet). */
  evaluatorScores: (number | null)[];
  /** Average Document Evaluation points (/50) — stage 1. */
  docScore: number | null;
  /** Per-evaluator Document Evaluation points (/50), committee order. */
  evaluatorDocScores: (number | null)[];
  interviewSelected: boolean;
}

export interface AdminListResponse {
  items: AdminApplicant[];
  total: number;
  page: number;
  pageSize: number;
  poolTotal: number;
  reviewers: { id: string; name: string; label: string }[];
}

export interface AdminStats {
  total: number;
  submitted: number;
  review: number;
  short: number;
  flags: number;
}

export interface ActivityEvent {
  action: string;
  at: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface EvaluationReviewer {
  name: string;
  submitted: boolean;
  documentSubmitted?: boolean;
  documentScore?: number | null;
  interviewScore?: number | null;
  shortlistRecommended: boolean;
  weightedScore: number | null;
  scores: Record<string, number>;
}

export interface Evaluation {
  reviewerCount: number;
  submittedCount: number;
  aggregateScore: number | null;
  criteria: { criterionId: string; weight: number; max: number; average: number | null }[];
  reviewers: EvaluationReviewer[];
}

export interface ReviewerRow {
  id: string;
  name: string | null;
  email: string;
  status: string;
  lastLoginAt: string | null;
  /** Final (both-stage) submissions. */
  reviewsSubmitted: number;
  /** Document Evaluations submitted (stage 1, incl. finals). */
  documentsSubmitted: number;
  /** False once the reviewer has submitted any evaluation. */
  removable: boolean;
}

export interface InterviewRankRow {
  id: string;
  reference: string | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: ApplicationStatus;
  docScore: number | null;
  docReviews: number;
  rank: number | null;
  interviewSelected: boolean;
  inviteStatus: 'sent' | 'failed' | null;
  inviteError: string | null;
  invitedAt: string | null;
}

export interface InterviewRanking {
  reviewerCount: number;
  interviewStartAt: string | null;
  interviewEndAt: string | null;
  items: InterviewRankRow[];
}

export interface InviteResult {
  total: number;
  sent: number;
  failed: { id: string; name: string; reason: string }[];
}

export interface StaffRow {
  id: string;
  name: string | null;
  email: string;
  status: string;
  lastLoginAt: string | null;
}

export interface AdminDetail extends AdminApplicant {
  dob: string | null;
  gender: string | null;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  conflictsText: string | null;
  education: { degree?: string | null; field?: string | null; institution?: string | null; year?: string | null }[];
  professionalQuals: { name?: string | null; body?: string | null; year?: string | null }[];
  employment: { org?: string | null; role?: string | null; fromMonth?: string | null; toMonth?: string | null; isCurrent?: boolean }[];
  references: { name?: string | null; positionOrg?: string | null; email?: string | null; phone?: string | null; relationship?: string | null }[];
  declarations: { itemId: string; answer: 'yes' | 'no'; explanation?: string | null }[];
  documents: { id: string; docType: string; originalFilename: string; sizeBytes: string; scannedClean: boolean }[];
  activity: ActivityEvent[];
  evaluation: Evaluation;
  recommendation: Recommendation | null;
}

export interface Recommendation {
  recommendedBy: string;
  recommenderEmail: string | null;
  message: string | null;
  recommendedAt: string;
}

interface Bucket {
  key: string;
  count: number;
}
interface LabelBucket {
  label: string;
  count: number;
}

export interface ReportData {
  kpis: {
    total: number;
    submitted: number;
    underReview: number;
    infoRequested: number;
    shortlisted: number;
    selected: number;
    notSelected: number;
    withFlags: number;
    avgScore: number | null;
    reviewedPct: number;
    reviewersActive: number;
    reviewerCount: number;
  };
  funnel: { key: string; count: number }[];
  statusBreakdown: { key: string; status: string; count: number }[];
  submissionsByDay: { date: string; count: number }[];
  gender: Bucket[];
  countries: Bucket[];
  degrees: Bucket[];
  experienceBuckets: LabelBucket[];
  expertise: Bucket[];
  scoreDistribution: LabelBucket[];
  criteriaAverages: { criterionId: string; weight: number; max: number; average: number | null }[];
  reviewerProgress: {
    id: string;
    name: string;
    submitted: number;
    assigned: number;
    avgScore: number | null;
    lastLoginAt: string | null;
  }[];
  reviewCoverage: { fully: number; partial: number; unreviewed: number; reviewerCount: number };
  flagsBreakdown: { itemId: string; count: number }[];
  eligibility: { total: number; meetsMsc: number; meets10yr: number; meetsBoth: number };
}

export interface SearchFilters {
  query?: string;
  status?: string[];
  scoreMin?: number;
  scoreMax?: number;
  yearsMin?: number;
  yearsMax?: number;
  degreeMin?: number;
  expertise?: string[];
  country?: string;
  gender?: string;
  flagged?: string;
  reviewState?: string;
  shortlist?: boolean;
  submittedFrom?: string;
  submittedTo?: string;
  sort?: string;
  page?: number;
}

export interface SearchItem extends AdminApplicant {
  reviewState: 'fully' | 'partial' | 'unreviewed';
  shortlist: boolean;
  gender: string | null;
}

function searchQs(f: SearchFilters): string {
  const qs = new URLSearchParams();
  if (f.query) qs.set('query', f.query);
  if (f.status?.length) qs.set('status', f.status.join(','));
  if (f.scoreMin != null) qs.set('scoreMin', String(f.scoreMin));
  if (f.scoreMax != null) qs.set('scoreMax', String(f.scoreMax));
  if (f.yearsMin != null) qs.set('yearsMin', String(f.yearsMin));
  if (f.yearsMax != null) qs.set('yearsMax', String(f.yearsMax));
  if (f.degreeMin != null) qs.set('degreeMin', String(f.degreeMin));
  if (f.expertise?.length) qs.set('expertise', f.expertise.join(','));
  if (f.country) qs.set('country', f.country);
  if (f.gender) qs.set('gender', f.gender);
  if (f.flagged) qs.set('flagged', f.flagged);
  if (f.reviewState) qs.set('reviewState', f.reviewState);
  if (f.shortlist) qs.set('shortlist', 'yes');
  if (f.submittedFrom) qs.set('submittedFrom', f.submittedFrom);
  if (f.submittedTo) qs.set('submittedTo', f.submittedTo);
  if (f.sort) qs.set('sort', f.sort);
  if (f.page) qs.set('page', String(f.page));
  return qs.toString();
}

export interface BlockedIpRow {
  id: string;
  ip: string;
  reason: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export const adminApi = {
  list(params: { query?: string; status?: string; sort?: string; page?: number }) {
    const qs = new URLSearchParams();
    if (params.query) qs.set('query', params.query);
    if (params.status && params.status !== 'all') qs.set('status', params.status);
    if (params.sort) qs.set('sort', params.sort);
    if (params.page) qs.set('page', String(params.page));
    const s = qs.toString();
    return api<AdminListResponse>(`/admin/applications${s ? `?${s}` : ''}`);
  },
  stats() {
    return api<AdminStats>('/admin/stats');
  },
  board() {
    return api<AdminApplicant[]>('/admin/board');
  },
  reports() {
    return api<ReportData>('/admin/reports');
  },
  search(f: SearchFilters) {
    const s = searchQs(f);
    return api<{ items: SearchItem[]; total: number; page: number; pageSize: number }>(
      `/admin/applications/search${s ? `?${s}` : ''}`,
    );
  },
  async exportCsv(f: SearchFilters) {
    const s = searchQs({ ...f, page: undefined });
    const res = await fetch(`${API_BASE}/admin/applications/export${s ? `?${s}` : ''}`, {
      headers: tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zemen-applications.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  /** Results sheet (Reference, Name, Document/Interview averages, Total, Decision). */
  async exportResults(scope: 'all' | 'interview' = 'all') {
    const res = await fetch(`${API_BASE}/admin/applications/export-results?scope=${scope}`, {
      headers: tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `zemen-results${scope === 'interview' ? '-interview' : ''}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
  reviewers() {
    return api<ReviewerRow[]>('/admin/reviewers');
  },
  auditors() {
    return api<StaffRow[]>('/admin/auditors');
  },
  recommenders() {
    return api<StaffRow[]>('/admin/recommenders');
  },
  supportAgents() {
    return api<StaffRow[]>('/admin/support-agents');
  },
  createUser(body: { name: string; email: string; phone?: string; role: 'reviewer' | 'admin' | 'auditor' | 'recommender' | 'support' }) {
    return api<{ id: string; name: string | null; email: string; role: string; tempPassword: string }>(
      '/admin/users',
      { method: 'POST', body },
    );
  },
  cycle() {
    return api<{
      id: string;
      title: string;
      submissionCloseAt: string;
      reviewCloseAt: string | null;
      interviewStartAt: string | null;
      interviewEndAt: string | null;
      interviewScoringOpen: boolean;
      acceptingApplications: boolean;
      reviewActive: boolean;
      statusLocked: boolean;
    }>('/admin/cycle');
  },
  updateCycleSettings(
    id: string,
    body: { submissionCloseAt?: string; reviewCloseAt?: string; interviewStartAt?: string; interviewEndAt?: string },
  ) {
    return api<{ id: string }>(`/admin/cycle/${id}/settings`, { method: 'PATCH', body });
  },
  removeReviewer(id: string) {
    return api<{ ok: true }>(`/admin/reviewers/${id}`, { method: 'DELETE' });
  },
  interviewRanking() {
    return api<InterviewRanking>('/admin/interview/ranking');
  },
  interviewInvite(applicationIds: string[], message: string) {
    return api<InviteResult>('/admin/interview/invite', { method: 'POST', body: { applicationIds, message } });
  },
  interviewSelection(applicationIds: string[], selected: boolean) {
    return api<{ ok: true; count: number }>('/admin/interview/selection', {
      method: 'POST',
      body: { applicationIds, selected },
    });
  },
  detail(id: string) {
    return api<AdminDetail>(`/admin/applications/${id}`);
  },
  updateStatus(id: string, status: string) {
    return api<{ id: string; status: ApplicationStatus }>(`/admin/applications/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  },
  message(id: string, body: { channel: string; template: string; subject?: string; body: string }) {
    return api<{ ok: true; id: string }>(`/admin/applications/${id}/messages`, { method: 'POST', body });
  },
  async download(id: string, docId: string) {
    const { url } = await api<{ url: string }>(`/admin/applications/${id}/documents/${docId}/download`);
    return url;
  },
  preview(id: string, docId: string) {
    return api<{ url: string; mimeType: string; filename: string }>(
      `/admin/applications/${id}/documents/${docId}/preview`,
    );
  },
  pendingNotifications() {
    return api<PendingNotification[]>('/admin/notifications/pending');
  },
  sendBulkNotifications() {
    return api<BulkNotifyResult>('/admin/notifications/send-bulk', { method: 'POST', body: {} });
  },
  blockedIps() {
    return api<BlockedIpRow[]>('/admin/blocked-ips');
  },
  addBlockedIp(input: { ip: string; note?: string }) {
    return api<BlockedIpRow>('/admin/blocked-ips', { method: 'POST', body: input });
  },
  removeBlockedIp(id: string) {
    return api<{ ok: true }>(`/admin/blocked-ips/${id}`, { method: 'DELETE' });
  },
};

export interface PendingNotification {
  id: string;
  reference: string | null;
  name: string;
  status: ApplicationStatus;
  statusLabel: string;
  email: string | null;
  phone: string | null;
}

export interface BulkNotifyResult {
  sent: number;
  total: number;
  failed: { id: string; name: string; reason: string }[];
}
