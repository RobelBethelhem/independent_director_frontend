import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Avatar, Logo } from './ui';

const ROLE_LABEL: Record<string, string> = {
  applicant: 'Applicant',
  admin: 'Administrator',
  reviewer: 'Reviewer',
  auditor: 'Auditor',
  recommender: 'Recommender',
};

const CONTEXT: Record<string, { k: string; v: string }> = {
  applicant: { k: 'Applicant Portal', v: 'Independent Director Application' },
  admin: { k: 'Administrator', v: 'Company Secretariat' },
  reviewer: { k: 'Reviewer', v: 'Nomination & Governance Committee' },
  auditor: { k: 'Auditor', v: 'Compliance & Oversight' },
  recommender: { k: 'Recommender', v: 'Talent Referral' },
};

/**
 * Top bar. Note: unlike the prototype's demo role switcher, role here comes from
 * the authenticated user — it is not toggleable.
 */
export function TopBar() {
  const { user, logout } = useAuth();
  const ctx = (user && CONTEXT[user.role]) || { k: 'Zemen Bank', v: 'Independent Director Portal' };
  return (
    <header className="topbar">
      <Link to="/">
        <Logo />
      </Link>
      <div className="divider" />
      <div className="ctx">
        <span className="k">{ctx.k}</span>
        <span className="v">{ctx.v}</span>
      </div>
      <div className="spacer" />
      {user && (
        <>
          <div className="userchip">
            <div>
              <div className="nm">{user.email}</div>
              <div className="rl">{ROLE_LABEL[user.role] ?? user.role}</div>
            </div>
            <Avatar seed={user.email} initials={user.email.slice(0, 2)} size={32} />
          </div>
          <button className="btn btn-ghost" onClick={() => void logout()}>
            Sign out
          </button>
        </>
      )}
    </header>
  );
}
