import { useEffect, useState } from 'react';
import { Ban, Trash2 } from 'lucide-react';
import { adminApi, type BlockedIpRow } from '../../lib/admin-api';
import { HttpError } from '../../lib/api';
import { Field, Input, Modal } from '../../components/ui';
import { fmtDate } from '../../lib/format';

export function BlockedIpsModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<BlockedIpRow[] | null>(null);
  const [ip, setIp] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setRows(await adminApi.blockedIps());
  }
  useEffect(() => {
    void load();
  }, []);

  async function add() {
    setError(null);
    if (!ip.trim()) {
      setError('Enter an IP address.');
      return;
    }
    setBusy(true);
    try {
      await adminApi.addBlockedIp({ ip: ip.trim(), note: note.trim() || undefined });
      setIp('');
      setNote('');
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Could not block that IP (check the format).');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await adminApi.removeBlockedIp(id);
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.messages.join(' · ') : 'Could not remove that block.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Blocked IP addresses" width={680} onClose={onClose}>
      <p className="muted" style={{ marginTop: 0, marginBottom: 18, fontSize: 13 }}>
        Addresses here are denied at sign-in. IPs are added automatically after repeated page-inspection
        attempts, or manually below. Removing one restores its access immediately.
      </p>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
          Block an address manually
        </div>
        <div className="grid-2" style={{ marginBottom: 12 }}>
          <Field label="IP address" required>
            <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="e.g. 203.0.113.5" />
          </Field>
          <Field label="Note">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (optional)" />
          </Field>
        </div>
        {error && <div className="errmsg" style={{ marginBottom: 8 }}>{error}</div>}
        <button className="btn btn-primary" disabled={busy} onClick={() => void add()}>
          <Ban size={16} /> {busy ? 'Working…' : 'Block IP'}
        </button>
      </div>

      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
        Currently blocked
      </div>
      {!rows ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">No blocked addresses.</p>
      ) : (
        <div className="table-card">
          <table className="dt">
            <thead>
              <tr>
                <th>IP</th>
                <th>Reason</th>
                <th>Note</th>
                <th>Blocked</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ cursor: 'default' }}>
                  <td className="mono" style={{ fontWeight: 600 }}>{r.ip}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.reason}</td>
                  <td style={{ color: 'var(--ink-3)' }}>{r.note ?? '—'}</td>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => void remove(r.id)}
                      title="Remove block"
                    >
                      <Trash2 size={15} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
