import { useEffect, useRef, useState } from 'react';
import { Camera, Eye, FileText, Loader2, Paperclip, Trash2, User } from 'lucide-react';
import { MAX_UPLOAD_BYTES, PHOTO_MIME_TYPES } from '../lib/constants';

interface CurrentDoc {
  id: string;
  originalFilename: string;
  scannedClean?: boolean | null;
}

/* ----------------------------- Per-entry PDF slot ----------------------------- */

interface EntryDocProps {
  currentDoc?: CurrentDoc | null;
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<void>;
  onRemove: () => Promise<void>;
  onPreview: (docId: string) => void;
  /** Short noun for the slot, e.g. "certificate" or "supporting document". */
  label?: string;
  required?: boolean;
}

/**
 * Compact single-file (PDF) uploader attached to one repeatable entry — a degree's
 * certificate or a position's supporting letter. Reuses the document chip styling.
 */
export function EntryDocUpload({
  currentDoc,
  onUpload,
  onRemove,
  onPreview,
  label = 'supporting document',
  required,
}: EntryDocProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Only PDF files are accepted.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('File exceeds the 10 MB limit.');
      return;
    }
    setError(null);
    setBusy(true);
    setPct(0);
    try {
      await onUpload(file, (p) => setPct(p));
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setBusy(false);
      setPct(null);
    }
  }

  return (
    <div style={{ marginTop: 6 }}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          void handle(e.target.files?.[0] ?? undefined);
          e.target.value = '';
        }}
      />
      {busy ? (
        <div className="doc-file" style={{ alignItems: 'center' }}>
          <div className="df-ic">
            <Loader2 size={16} className="spin" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="up-bar">
              <i style={{ width: `${pct ?? 0}%` }} />
            </div>
          </div>
          <span className="muted" style={{ fontSize: 12, width: 38, textAlign: 'right' }}>
            {pct ?? 0}%
          </span>
        </div>
      ) : currentDoc ? (
        <div className="doc-file">
          <div className="df-ic">
            <FileText size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentDoc.originalFilename}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'capitalize' }}>
              {label}
              {currentDoc.scannedClean === false ? ' · Processing…' : ' · Uploaded'}
            </div>
          </div>
          <button className="iconbtn" style={{ width: 30, height: 30 }} type="button" title="Preview" onClick={() => onPreview(currentDoc.id)}>
            <Eye size={14} />
          </button>
          <button className="iconbtn" style={{ width: 30, height: 30 }} type="button" title="Remove" onClick={() => void onRemove()}>
            <Trash2 size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-soft btn-sm"
          style={required ? { borderColor: 'var(--brand)', color: 'var(--brand-700)' } : undefined}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip size={14} /> Attach {label} (PDF){required ? ' *' : ''}
        </button>
      )}
      {error && (
        <div className="errmsg" style={{ marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Profile photo ------------------------------- */

interface PhotoProps {
  currentDoc?: CurrentDoc | null;
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<void>;
  onRemove: () => Promise<void>;
  /** Resolves a short-lived image URL for the thumbnail. */
  loadThumb: (docId: string) => Promise<string>;
}

/** Square image uploader for the applicant's profile photo (PNG/JPEG/WebP). */
export function PhotoUpload({ currentDoc, onUpload, onRemove, loadThumb }: PhotoProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (currentDoc) {
      void loadThumb(currentDoc.id)
        .then((u) => !cancelled && setThumb(u))
        .catch(() => undefined);
    } else {
      setThumb(null);
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDoc?.id]);

  async function handle(file: File | undefined) {
    if (!file) return;
    if (!PHOTO_MIME_TYPES.includes(file.type)) {
      setError('Upload an image — PNG, JPEG or WebP.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Image exceeds the 10 MB limit.');
      return;
    }
    setError(null);
    setBusy(true);
    setPct(0);
    try {
      await onUpload(file, (p) => setPct(p));
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setBusy(false);
      setPct(null);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          void handle(e.target.files?.[0] ?? undefined);
          e.target.value = '';
        }}
      />
      <div
        onClick={() => !busy && inputRef.current?.click()}
        style={{
          width: 96,
          height: 96,
          borderRadius: 14,
          flex: '0 0 auto',
          border: `1.5px ${currentDoc ? 'solid' : 'dashed'} var(--line-2)`,
          background: 'var(--paper-2)',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          cursor: busy ? 'default' : 'pointer',
          color: 'var(--ink-3)',
        }}
        title={currentDoc ? 'Replace photo' : 'Upload photo'}
      >
        {busy ? (
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={20} className="spin" />
            <div style={{ fontSize: 11, marginTop: 4 }}>{pct ?? 0}%</div>
          </div>
        ) : thumb ? (
          <img src={thumb} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : currentDoc ? (
          <User size={30} />
        ) : (
          <Camera size={26} />
        )}
      </div>
      <div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Camera size={14} /> {currentDoc ? 'Replace photo' : 'Upload photo'}
          </button>
          {currentDoc && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void onRemove()}>
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
        <div className="hint" style={{ marginTop: 6 }}>
          A recent passport-style photo — PNG, JPEG or WebP, up to 10 MB.
        </div>
        {error && (
          <div className="errmsg" style={{ marginTop: 4 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
