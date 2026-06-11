import { api } from './api';

export interface AuditLogRow {
  id: string;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  outcome: 'success' | 'failure';
  entityType: string | null;
  entityId: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AuditLogPage {
  items: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditStats {
  total: number;
  failedLogins: number;
  last24h: number;
  distinctActors: number;
}

export interface AuditFilters {
  page?: number;
  query?: string;
  action?: string;
  outcome?: string;
  actorRole?: string;
  from?: string;
  to?: string;
}

export const auditApi = {
  logs(f: AuditFilters) {
    const qs = new URLSearchParams();
    if (f.page) qs.set('page', String(f.page));
    if (f.query) qs.set('query', f.query);
    if (f.action) qs.set('action', f.action);
    if (f.outcome) qs.set('outcome', f.outcome);
    if (f.actorRole) qs.set('actorRole', f.actorRole);
    if (f.from) qs.set('from', f.from);
    if (f.to) qs.set('to', f.to);
    const s = qs.toString();
    return api<AuditLogPage>(`/audit/logs${s ? `?${s}` : ''}`);
  },
  stats() {
    return api<AuditStats>('/audit/stats');
  },
};
