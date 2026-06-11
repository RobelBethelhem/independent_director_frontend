import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { UserRole } from '../lib/types';

/**
 * Route guard. Redirects unauthenticated users to /auth, and enforces role when
 * `roles` is given. Server-side checks remain the real boundary — this is UX only.
 *
 * Staff with a temporary password (`mustChangePassword`) are funnelled to
 * /change-password until they set their own — unless `ignorePasswordChange` is set
 * (so the change-password route itself stays reachable).
 */
export function ProtectedRoute({
  roles,
  ignorePasswordChange = false,
}: {
  roles?: UserRole[];
  ignorePasswordChange?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }} className="muted">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  if (!ignorePasswordChange && user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
