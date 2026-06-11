import type { ApiError, AuthSession } from './types';

/**
 * In dev this stays '/api/v1' (proxied to the backend by Vite). In production set
 * VITE_API_BASE_URL to the deployed API base, e.g. https://api.example.com/api/v1.
 */
export const API_BASE =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')) || '/api/v1';

const ACCESS_KEY = 'zb.accessToken';
const REFRESH_KEY = 'zb.refreshToken';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(session: Pick<AuthSession, 'accessToken' | 'refreshToken'>) {
    localStorage.setItem(ACCESS_KEY, session.accessToken);
    localStorage.setItem(REFRESH_KEY, session.refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class HttpError extends Error {
  constructor(
    public status: number,
    public body: ApiError,
  ) {
    super(Array.isArray(body.message) ? body.message.join(', ') : body.message);
  }

  /** Flattened list of human-readable messages (validation errors are arrays). */
  get messages(): string[] {
    return Array.isArray(this.body.message) ? this.body.message : [this.body.message];
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  /** Internal: prevents infinite refresh recursion. */
  _retried?: boolean;
}

async function refreshSession(): Promise<boolean> {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return false;
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    tokenStore.clear();
    return false;
  }
  const session = (await res.json()) as AuthSession;
  tokenStore.set(session);
  return true;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, _retried = false } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Transparently refresh once on an expired access token.
  if (res.status === 401 && auth && !_retried && tokenStore.refresh) {
    if (await refreshSession()) {
      return api<T>(path, { ...options, _retried: true });
    }
  }

  if (res.status === 204) return undefined as T;

  // An empty body (e.g. GET /applications/mine when there's no application yet)
  // must come back as null — not {} — so callers can distinguish "nothing".
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    throw new HttpError(res.status, (data ?? {}) as ApiError);
  }
  return data as T;
}
