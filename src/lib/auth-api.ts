import { api, tokenStore, HttpError } from './api';
import type { AuthSession, LoginResult, Me } from './types';
import { isAuthSession } from './types';

/**
 * After a login response hands us tokens, immediately prove them against the
 * server with GET /auth/me. This defeats "MFA/login bypass via response
 * manipulation": if an attacker tampers with the login/2FA response to inject
 * fake tokens, those tokens aren't server-signed, so /auth/me returns 401 and
 * we reject the login instead of showing an authenticated UI. (Every protected
 * API call already rejects forged tokens server-side; this closes the visual
 * bypass too.)
 */
async function validateSession(): Promise<void> {
  try {
    await api<Me>('/auth/me');
  } catch (err) {
    tokenStore.clear();
    throw new HttpError(401, { statusCode: 401, message: 'Could not verify your session. Please sign in again.' });
  }
}

/** Auth endpoints from BACKEND.md → /auth/*. */
export const authApi = {
  register(input: { email: string; phone: string; password: string; recommendationToken?: string }) {
    return api<{ email: string; otpRequired: true; otpLength: number; devCode?: string }>('/auth/register', {
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
    await validateSession();
    return session;
  },

  resendOtp(email: string) {
    return api<{ ok: true; otpLength: number; devCode?: string }>('/auth/resend-otp', {
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
    if (isAuthSession(result)) {
      tokenStore.set(result, { fresh: true });
      await validateSession();
    }
    return result;
  },

  async verifyTotpLogin(input: { challengeToken: string; code: string }): Promise<LoginResult> {
    const result = await api<LoginResult>('/auth/2fa/verify-login', {
      method: 'POST',
      body: input,
      auth: false,
    });
    if (isAuthSession(result)) {
      tokenStore.set(result, { fresh: true });
      await validateSession();
    }
    return result;
  },

  async confirmSessionAndLogin(challengeToken: string): Promise<AuthSession> {
    const session = await api<AuthSession>('/auth/login/confirm-session', {
      method: 'POST',
      body: { challengeToken },
      auth: false,
    });
    tokenStore.set(session, { fresh: true });
    await validateSession();
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
