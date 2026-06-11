import { api } from './api';

export interface MyRecommendation {
  id: string;
  candidateName: string;
  candidateEmail: string;
  message: string | null;
  status: 'Invited' | 'Opened' | 'Registered' | 'Applying' | 'Submitted';
  clickedAt: string | null;
  createdAt: string;
  link: string;
}

export interface RecommendationInvite {
  recommenderName: string;
  candidateName: string;
  candidateEmail: string;
  message: string | null;
}

export const recommendationsApi = {
  create(body: { candidateName: string; candidateEmail: string; message?: string }) {
    return api<MyRecommendation>('/recommendations', { method: 'POST', body });
  },
  mine() {
    return api<MyRecommendation[]>('/recommendations/mine');
  },
  byToken(token: string) {
    return api<RecommendationInvite>(`/recommendations/by-token/${token}`, { auth: false });
  },
};
