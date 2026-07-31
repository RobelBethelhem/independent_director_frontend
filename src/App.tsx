import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { ForgotPassword } from './pages/ForgotPassword';
import { RecommendedLanding } from './pages/RecommendedLanding';
import { ADMIN_PATH, ADMIN_REPORTS_PATH, ADMIN_SEARCH_PATH } from './lib/routes';

// Code-split the post-login screens so landing/sign-in visitors — the majority,
// and the most likely on mobile/slow links — don't download the applicant wizard
// or the entire admin/reviewer/auditor/recommender app in the initial bundle.
// Pages use named exports, so map each to a default for React.lazy.
const Wizard = lazy(() => import('./pages/Wizard').then((m) => ({ default: m.Wizard })));
const Success = lazy(() => import('./pages/Success').then((m) => ({ default: m.Success })));
const Tracking = lazy(() => import('./pages/Tracking').then((m) => ({ default: m.Tracking })));
const ChangePassword = lazy(() => import('./pages/ChangePassword').then((m) => ({ default: m.ChangePassword })));
const Security = lazy(() => import('./pages/Security').then((m) => ({ default: m.Security })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminReports = lazy(() => import('./pages/admin/AdminReports').then((m) => ({ default: m.AdminReports })));
const AdvancedSearch = lazy(() => import('./pages/admin/AdvancedSearch').then((m) => ({ default: m.AdvancedSearch })));
const ReviewerConsole = lazy(() => import('./pages/review/ReviewerConsole').then((m) => ({ default: m.ReviewerConsole })));
const AuditConsole = lazy(() => import('./pages/audit/AuditConsole').then((m) => ({ default: m.AuditConsole })));
const RecommenderConsole = lazy(() =>
  import('./pages/recommend/RecommenderConsole').then((m) => ({ default: m.RecommenderConsole })),
);
const SupportConsole = lazy(() => import('./pages/support/SupportConsole').then((m) => ({ default: m.SupportConsole })));

// The floating "Get help" chat is on every page (applicants + anonymous visitors).
// Lazy so it never blocks first paint; it appears a moment after the page loads.
const SupportWidget = lazy(() => import('./components/support/SupportWidget').then((m) => ({ default: m.SupportWidget })));

/** Shown briefly while a lazily-loaded route chunk downloads. */
function RouteFallback() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh', color: 'var(--ink-3)', fontSize: 14 }}>
      Loading…
    </div>
  );
}

/** Chrome layout (top bar + content) for the in-app screens. The Suspense
 *  boundary wraps only the content, so the top bar stays put during chunk loads. */
function Chrome() {
  return (
    <div className="app">
      <TopBar />
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Full-bleed screens without the standard chrome. */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/recommended/:token" element={<RecommendedLanding />} />

      {/* Screens with the top bar. */}
      <Route element={<Chrome />}>
        <Route path="/" element={<Landing />} />
        <Route element={<ProtectedRoute ignorePasswordChange />}>
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>
        <Route element={<ProtectedRoute roles={['admin', 'reviewer', 'auditor', 'recommender']} />}>
          <Route path="/security" element={<Security />} />
        </Route>
        <Route element={<ProtectedRoute roles={['applicant']} />}>
          <Route path="/apply" element={<Wizard />} />
          <Route path="/success" element={<Success />} />
          <Route path="/track" element={<Tracking />} />
        </Route>
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path={ADMIN_PATH} element={<AdminDashboard />} />
          <Route path={ADMIN_REPORTS_PATH} element={<AdminReports />} />
          <Route path={ADMIN_SEARCH_PATH} element={<AdvancedSearch />} />
        </Route>
        <Route element={<ProtectedRoute roles={['reviewer']} />}>
          <Route path="/review" element={<ReviewerConsole />} />
        </Route>
        <Route element={<ProtectedRoute roles={['auditor', 'admin']} />}>
          <Route path="/audit" element={<AuditConsole />} />
        </Route>
        <Route element={<ProtectedRoute roles={['recommender']} />}>
          <Route path="/recommend" element={<RecommenderConsole />} />
        </Route>
        <Route element={<ProtectedRoute roles={['support', 'admin']} />}>
          <Route path="/support" element={<SupportConsole />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Root: the routed app plus the always-on support chat widget. */
export function AppRoot() {
  return (
    <>
      <App />
      <Suspense fallback={null}>
        <SupportWidget />
      </Suspense>
    </>
  );
}
