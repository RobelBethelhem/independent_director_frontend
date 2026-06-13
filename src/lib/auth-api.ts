import { api, tokenStore } from './api';
import type { AuthSession, Me } from './types';

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
    tokenStore.set(session);
    return session;
  },

  resendOtp(email: string) {
    return api<{ ok: true; devCode?: string }>('/auth/resend-otp', {
      method: 'POST',
      body: { email },
      auth: false,
    });
  },

  async login(input: { email: string; password: string }): Promise<AuthSession> {
    const session = await api<AuthSession>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    });
    tokenStore.set(session);
    return session;
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
