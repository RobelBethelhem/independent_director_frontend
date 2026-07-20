import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { ForgotPassword } from './pages/ForgotPassword';
import { Wizard } from './pages/Wizard';
import { Success } from './pages/Success';
import { Tracking } from './pages/Tracking';
import { ChangePassword } from './pages/ChangePassword';
import { Security } from './pages/Security';
import { ADMIN_PATH, ADMIN_REPORTS_PATH, ADMIN_SEARCH_PATH } from './lib/routes';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminReports } from './pages/admin/AdminReports';
import { AdvancedSearch } from './pages/admin/AdvancedSearch';
import { ReviewerConsole } from './pages/review/ReviewerConsole';
import { AuditConsole } from './pages/audit/AuditConsole';
import { RecommenderConsole } from './pages/recommend/RecommenderConsole';
import { RecommendedLanding } from './pages/RecommendedLanding';

/** Chrome layout (top bar + content) for the in-app screens. */
function Chrome() {
  return (
    <div className="app">
      <TopBar />
      <Outlet />
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
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
