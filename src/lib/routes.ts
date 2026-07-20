/**
 * Browser route for the administrator console. Deliberately NOT "/admin":
 * a predictable admin path is trivially found by directory-brute-force
 * scanners (Gobuster/dirb wordlists). Admins never type this — they sign in at
 * /auth and are redirected here automatically (see homeFor) — so it can be as
 * obscure as we like. This is defense-in-depth reconnaissance-reduction only;
 * the real protection is JWT + role checks on the /api/v1/admin endpoints.
 *
 * To change it, edit ONLY this constant.
 */
export const ADMIN_PATH = '/zb-mgmt-a7f3c9';
export const ADMIN_REPORTS_PATH = `${ADMIN_PATH}/reports`;
export const ADMIN_SEARCH_PATH = `${ADMIN_PATH}/search`;

/** Where each role lands after signing in. */
export function homeFor(role: string): string {
  switch (role) {
    case 'admin':
      return ADMIN_PATH;
    case 'reviewer':
      return '/review';
    case 'auditor':
      return '/audit';
    case 'recommender':
      return '/recommend';
    default:
      return '/apply';
  }
}
