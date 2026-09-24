import { api } from './api';

export interface ReviewOverview {
  unlocked: boolean;
  closeAt: string;
  /** Admin-set review deadline, if any — null means no deadline configured. */
  reviewCloseAt: string | null;
  /** True when reviewCloseAt has passed (distinct from "not yet opened"). */
  ended: boolean;
  /** Stage 1 (Document Evaluation) window is open. */
  docOpen: boolean;
  /** Stage 2 — interview period has ended; Interview scoring + final submit open. */
  interviewOpen: boolean;
  interviewStartAt: string | null;
  interviewEndAt: string | null;
  interviewCandidates: number;
  received: number;
  toAssess: number;
  /** Final (both-stage) submissions by me. */
  reviewedByMe: number;
  /** Document Evaluations submitted by me (incl. finals). */
  documentDoneByMe: number;
  shortlisted: number;
  criteriaCount: number;
}

export type ReviewStage = 'document' | 'interview';

export interface ReviewCandidate {
  id: string;
  reference: string | null;
  title: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  role: string;
  expertise: string[];
  flags: number;
  /** Which stage this candidate is in for me right now. */
  stage: ReviewStage;
  interviewSelected: boolean;
  myDocSubmitted: boolean;
  myFinalSubmitted: boolean;
  /** My Document Evaluation points (/50) once submitted. */
  myDocScore: number | null;
  /** My final total (/100) once final-submitted. */
  myScore: number | null;
  mySubmitted: boolean;
  /** Relative to `stage`. */
  myStatus: 'none' | 'draft' | 'submitted';
  myScoredCount: number;
  /** Criteria needed for this stage's submission (5 document / 8 final). */
  stageTotal: number;
  myShortlist: boolean;
}

export interface SubmitAllResult {
  submitted: number;
  documentSubmitted: number;
  finalSubmitted: number;
  skipped: { id: string; name: string; scored: number; total: number }[];
}

export interface ReviewDossier {
  id: string;
  reference: string | null;
  title: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  role: string;
  dob: string | null;
  gender: string | null;
  nationality: string | null;
  city: string | null;
  country: string | null;
  years: number | null;
  boards: number;
  flags: number;
  expertise: string[];
  photo: { id: string; originalFilename: string } | null;
  education: {
    id?: string;
    degree?: string | null;
    field?: string | null;
    institution?: string | null;
    year?: string | null;
    document?: { id: string; originalFilename: string } | null;
  }[];
  professionalQuals: { name?: string | null; body?: string | null; year?: string | null }[];
  employment: {
    id?: string;
    org?: string | null;
    role?: string | null;
    fromMonth?: string | null;
    toMonth?: string | null;
    isCurrent?: boolean;
    summary?: string | null;
    document?: { id: string; originalFilename: string } | null;
  }[];
  boardEntries: {
    org?: string | null;
    position?: string | null;
    type?: string | null;
    fromMonth?: string | null;
    toMonth?: string | null;
    isCurrent?: boolean | null;
    period?: string | null;
  }[];
  references: { name?: string | null; positionOrg?: string | null; relationship?: string | null }[];
  conflictsText: string | null;
  declarations: { itemId: string; answer: 'yes' | 'no'; explanation?: string | null }[];
  documents: { id: string; docType: string; originalFilename: string }[];
  recommendation: { recommendedBy: string; recommenderEmail: string | null; message: string | null; recommendedAt: string } | null;
  myScores: Record<string, number>;
  myReview: {
    comment: string | null;
    shortlistRecommended: boolean;
    /** Final submission (both stages). */
    submitted: boolean;
    documentSubmitted: boolean;
    weightedScore: string | null;
    documentScore: string | null;
    interviewScore: string | null;
  };
  stage: ReviewStage;
  interviewSelected: boolean;
  canEditDocument: boolean;
  canEditInterview: boolean;
  interviewBlockedReason: string | null;
  docOpen: boolean;
  interviewOpen: boolean;
  interviewStartAt: string | null;
  interviewEndAt: string | null;
}

export interface ShortlistEntry {
  id: string;
  reference: string | null;
  name: string;
  weightedScore: number | null;
  expertise: string[];
}

export const reviewApi = {
  overview() {
    return api<ReviewOverview>('/review/overview');
  },
  list() {
    return api<ReviewCandidate[]>('/review/applications');
  },
  dossier(id: string) {
    return api<ReviewDossier>(`/review/applications/${id}`);
  },
  suggestedScores(id: string) {
    return api<{ criterionId: string; value: number; rationale: string }[]>(
      `/review/applications/${id}/suggested-scores`,
    );
  },
  putScores(id: string, scores: { criterionId: string; value: number }[]) {
    return api<ReviewDossier>(`/review/applications/${id}/scores`, { method: 'PUT', body: { scores } });
  },
  putReview(
    id: string,
    body: { comment?: string; shortlistRecommended?: boolean; submitted?: boolean; submitDocument?: boolean },
  ) {
    return api<ReviewDossier>(`/review/applications/${id}/review`, { method: 'PUT', body });
  },
  shortlist() {
    return api<ShortlistEntry[]>('/review/shortlist');
  },
  submitAll() {
    return api<SubmitAllResult>('/review/submit-all', { method: 'POST', body: {} });
  },
  preview(appId: string, docId: string) {
    return api<{ url: string; mimeType: string; filename: string }>(
      `/review/applications/${appId}/documents/${docId}/preview`,
    );
  },
  async download(appId: string, docId: string) {
    const { url } = await api<{ url: string }>(`/review/applications/${appId}/documents/${docId}/download`);
    return url;
  },
};
