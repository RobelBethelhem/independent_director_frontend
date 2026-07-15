import { api, tokenStore } from './api';
import type { AuthSession, LoginResult, Me } from './types';
import { isLoginChallenge } from './types';

/** Auth endpoints from BACKEND.md → /auth/*. */
export const authApi = {
  register(input: { email: string; phone: string; password: string; recommendationToken?: string }) {
    return api<{ email: string; otpRequired: true; devCode?: string }>('/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    });
  },

  async verifyOtp(input: { email: string; code: string }): Promise<AuthSession> {
    const session = await api<AuthSession>('/auth/verify-otp', {
      method: 'POST',
      body: input,
      auth: false,
    });
    tokenStore.set(session, { fresh: true });
    return session;
  },

  resendOtp(email: string) {
    return api<{ ok: true; devCode?: string }>('/auth/resend-otp', {
      method: 'POST',
      body: { email },
      auth: false,
    });
  },

  /** Password step. Returns a real session immediately, or a challenge
   *  (2FA and/or single-sign-on conflict) that must be resolved via
   *  verifyTotpLogin / confirmSessionAndLogin below. */
  async login(input: { email: string; password: string }): Promise<LoginResult> {
    const result = await api<LoginResult>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    });
    if (!isLoginChallenge(result)) tokenStore.set(result, { fresh: true });
    return result;
  },

  async verifyTotpLogin(input: { challengeToken: string; code: string }): Promise<LoginResult> {
    const result = await api<LoginResult>('/auth/2fa/verify-login', {
      method: 'POST',
      body: input,
      auth: false,
    });
    if (!isLoginChallenge(result)) tokenStore.set(result, { fresh: true });
    return result;
  },

  async confirmSessionAndLogin(challengeToken: string): Promise<AuthSession> {
    const session = await api<AuthSession>('/auth/login/confirm-session', {
      method: 'POST',
      body: { challengeToken },
      auth: false,
    });
    tokenStore.set(session, { fresh: true });
    return session;
  },

  setupTotp() {
    return api<{ secret: string; qrDataUri: string }>('/auth/2fa/setup', { method: 'POST' });
  },

  confirmTotpSetup(code: string) {
    return api<{ ok: true }>('/auth/2fa/confirm', { method: 'POST', body: { code } });
  },

  disableTotp(input: { password: string; code: string }) {
    return api<{ ok: true }>('/auth/2fa/disable', { method: 'POST', body: input });
  },

  forgotPassword(email: string) {
    return api<{ ok: true }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      auth: false,
    });
  },

  resetPassword(input: { email: string; code: string; password: string }) {
    return api<{ ok: true }>('/auth/reset-password', {
      method: 'POST',
      body: input,
      auth: false,
    });
  },

  async logout(): Promise<void> {
    try {
      await api('/auth/logout', { method: 'POST', body: {} });
    } finally {
      tokenStore.clear();
    }
  },

  changePassword(input: { currentPassword: string; newPassword: string }) {
    return api<{ ok: true }>('/auth/change-password', { method: 'POST', body: input });
  },

  me() {
    return api<Me>('/auth/me');
  },
};
