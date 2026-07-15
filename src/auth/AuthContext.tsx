import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../lib/auth-api';
import { sessionActivity, tokenStore } from '../lib/api';
import type { AuthSession, Me } from '../lib/types';

interface AuthContextValue {
  user: Me | null;
  loading: boolean;
  setSession: (session: AuthSession) => void;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Inactivity cap — active use resets this on every interaction. */
const IDLE_LIMIT_MS = 5 * 60_000;
/** Absolute cap from the moment of fresh login, regardless of activity —
 *  mirrors the backend's SESSION_MAX_MINUTES enforced at /auth/refresh. */
const ABSOLUTE_LIMIT_MS = 15 * 60_000;
const CHECK_INTERVAL_MS = 10_000;
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'] as const;
export const SESSION_END_REASON_KEY = 'zb.sessionEndReason';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<Me | null>(null);
  userRef.current = user;

  const refreshMe = async () => {
    if (!tokenStore.access) {
      setUser(null);
      return;
    }
    try {
      setUser(await authApi.me());
    } catch {
      setUser(null);
      tokenStore.clear();
    }
  };

  // On first load, hydrate the session from any stored token.
  useEffect(() => {
    void (async () => {
      await refreshMe();
      setLoading(false);
    })();
  }, []);

  // Idle (5m) / absolute (15m) session timeout — enforced client-side since a
  // stateless JWT has no server-side notion of "activity". Forcing user to
  // null here is sufficient to show the login page: ProtectedRoute redirects
  // to /auth as soon as it sees no user.
  useEffect(() => {
    if (!user) return undefined;
    sessionActivity.touch();
    const markActivity = () => sessionActivity.touch();
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, markActivity, { passive: true }));

    const interval = window.setInterval(() => {
      if (!userRef.current) return;
      // The backend now ties every access token to a server-side session id
      // (see JwtStrategy), so a token can go dead mid-lifetime — e.g. this
      // account was just signed in on another device and confirmed the
      // takeover there. When that happens, api.ts's silent-refresh-on-401
      // already fails and clears the stored tokens; this just catches the
      // React state up to that within one tick instead of leaving the UI
      // looking signed-in while every request quietly 401s.
      if (!tokenStore.access) {
        sessionStorage.setItem(SESSION_END_REASON_KEY, 'superseded');
        setUser(null);
        return;
      }
      const now = Date.now();
      const lastActivity = sessionActivity.get();
      const startedAt = tokenStore.sessionStartedAt;
      const idleExpired = lastActivity !== null && now - lastActivity > IDLE_LIMIT_MS;
      const absoluteExpired = startedAt !== null && now - startedAt > ABSOLUTE_LIMIT_MS;
      if (idleExpired || absoluteExpired) {
        sessionStorage.setItem(SESSION_END_REASON_KEY, idleExpired ? 'idle' : 'absolute');
        // authApi.logout() clears the local tokens itself (in its `finally`)
        // once the request settles — clearing them here first would strip the
        // Authorization header the backend needs to invalidate the session.
        void authApi.logout().catch(() => undefined);
        setUser(null);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, markActivity));
      window.clearInterval(interval);
    };
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      setSession: (session) => setUser({ ...session.user, phone: null, phoneVerified: false, status: 'active' }),
      refreshMe,
      logout: async () => {
        await authApi.logout();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
