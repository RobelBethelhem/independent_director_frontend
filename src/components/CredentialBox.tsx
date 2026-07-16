import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyText } from '../lib/clipboard';

/**
 * Shows the one-time temporary password for a freshly created staff account so
 * the admin can hand it over securely. The new user is forced to change it on
 * first login. The password is also emailed.
 */
export function CredentialBox({
  name,
  email,
  tempPassword,
}: {
  name: string;
  email: string;
  tempPassword: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void copyText(tempPassword).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="indep-banner clear" style={{ display: 'block', padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{name} added — account ready</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 10 }}>
        Share these credentials securely with <b>{email}</b>. They’ll be required to set a new password on first
        login. (Also emailed.)
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <code
          className="mono"
          style={{
            flex: 1,
            background: 'var(--surface)',
            border: '1px solid var(--line-2)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 14,
            letterSpacing: '.04em',
          }}
        >
          {tempPassword}
        </code>
        <button type="button" className="btn btn-soft btn-sm" onClick={copy}>
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
