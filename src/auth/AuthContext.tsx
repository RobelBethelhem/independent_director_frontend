import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../lib/auth-api';
import { tokenStore } from '../lib/api';
import type { AuthSession, Me } from '../lib/types';

interface AuthContextValue {
  user: Me | null;
  loading: boolean;
  setSession: (session: AuthSession) => void;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

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
