import { api } from './api';

export interface AppWindow {
  opensAt: string;
  submissionCloseAt: string;
  acceptingApplications: boolean;
}

export const recruitmentApi = {
  /** Public application-window info for the landing countdown. */
  window() {
    return api<AppWindow>('/recruitment/window', { auth: false });
  },
};
