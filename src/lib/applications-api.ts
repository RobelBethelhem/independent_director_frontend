import { api } from './api';
import type { Application } from './types';

/** Applicant-side application draft endpoints (/applications/*). */
export const applicationsApi = {
  mine() {
    return api<Application | null>('/applications/mine');
  },
  createDraft() {
    return api<Application>('/applications', { method: 'POST', body: {} });
  },
  patch(id: string, fields: Partial<Application>) {
    return api<Application>(`/applications/${id}`, { method: 'PATCH', body: fields });
  },
  saveProgress(id: string, progress: { currentStep: number; maxStepSeen: number }) {
    return api<{ ok: true }>(`/applications/${id}/progress`, { method: 'PATCH', body: progress });
  },
  putEducation(id: string, items: Application['education']) {
    return api<Application>(`/applications/${id}/education`, { method: 'PUT', body: { items } });
  },
  putProfessional(id: string, items: Application['professionalQuals']) {
    return api<Application>(`/applications/${id}/professional`, { method: 'PUT', body: { items } });
  },
  putEmployment(id: string, items: Application['employment']) {
    return api<Application>(`/applications/${id}/employment`, { method: 'PUT', body: { items } });
  },
  putBoards(id: string, items: Application['boards']) {
    return api<Application>(`/applications/${id}/boards`, { method: 'PUT', body: { items } });
  },
  putReferences(id: string, items: Application['references']) {
    return api<Application>(`/applications/${id}/references`, { method: 'PUT', body: { items } });
  },
  putExpertise(id: string, values: string[]) {
    return api<Application>(`/applications/${id}/expertise`, { method: 'PUT', body: { values } });
  },
  putDeclarations(id: string, items: Application['declarations']) {
    return api<Application>(`/applications/${id}/declarations`, { method: 'PUT', body: { items } });
  },
  certify(id: string, certified: boolean) {
    return api<Application>(`/applications/${id}/certify`, { method: 'PUT', body: { certified } });
  },
  submit(id: string) {
    return api<Application>(`/applications/${id}/submit`, { method: 'POST', body: {} });
  },
  status(id: string) {
    return api<ApplicationStatusResponse>(`/applications/${id}/status`);
  },
};

export interface ApplicationStatusResponse {
  status: string;
  reference: string | null;
  submittedAt: string | null;
  infoRequested: boolean;
  timeline: { label: string; state: 'done' | 'current' | 'upcoming'; node: string }[];
}
