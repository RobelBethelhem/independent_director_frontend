import { useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Modal, Input } from './ui';

/**
 * Final-submission gate. Shows a declaration the user must read, then requires
 * them to type the word "submit" — so submission is always deliberate, never an
 * accidental click. Used by both the reviewer and the applicant.
 */
export function SubmitConfirmModal({
  title,
  declaration,
  confirmLabel = 'Submit',
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string;
  declaration: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const ok = typed.trim().toLowerCase() === 'submit';

  return (
    <Modal
      title={title}
      width={580}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!ok || busy} onClick={onConfirm}>
            <Check size={16} /> {busy ? 'Submitting…' : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>{declaration}</div>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
          Type <b style={{ color: 'var(--brand)' }}>submit</b> to confirm
        </label>
        <Input
          value={typed}
          autoFocus
          placeholder="submit"
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && ok && !busy) onConfirm();
          }}
        />
        <div className="hint" style={{ marginTop: 6 }}>
          This confirms you are submitting intentionally — it cannot be undone.
        </div>
      </div>
    </Modal>
  );
}
