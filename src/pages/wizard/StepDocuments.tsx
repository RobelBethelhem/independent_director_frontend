import { useRef, useState, type DragEvent } from 'react';
import { Eye, FileText, Loader2, TriangleAlert, Trash2, Upload } from 'lucide-react';
import type { DocumentRecord } from '../../lib/documents-api';
import { ACCEPTED_UPLOAD, DOC_TYPES, MAX_UPLOAD_BYTES } from '../../lib/constants';
import { fmtBytes } from '../../lib/format';

interface Props {
  documents: DocumentRecord[];
  onUpload: (docType: string, file: File, onProgress: (pct: number) => void) => Promise<void>;
  onRemove: (docId: string) => Promise<void>;
  onPreview: (docId: string) => void;
  errors?: Record<string, string>;
}

interface UploadItem {
  key: string;
  name: string;
  pct: number;
}

export function StepDocuments({ documents, onUpload, onRemove, onPreview, errors = {} }: Props) {
  const [uploading, setUploading] = useState<Record<string, UploadItem[]>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFiles(docType: string, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    const notPdf = files.filter((f) => !isPdf(f)).map((f) => f.name);
    const pdfs = files.filter(isPdf);
    const tooBig = pdfs.filter((f) => f.size > MAX_UPLOAD_BYTES).map((f) => f.name);
    const ok = pdfs.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    const msgs = [
      notPdf.length ? `Only PDF files are accepted — rejected: ${notPdf.join(', ')}.` : '',
      tooBig.length ? `${tooBig.join(', ')} exceed${tooBig.length > 1 ? '' : 's'} the 10 MB limit.` : '',
    ].filter(Boolean);
    setError((e) => ({ ...e, [docType]: msgs.join(' ') }));

    // Upload sequentially so each file shows clear progress.
    for (const file of ok) {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setUploading((u) => ({ ...u, [docType]: [...(u[docType] ?? []), { key, name: file.name, pct: 0 }] }));
      try {
        await onUpload(docType, file, (pct) =>
          setUploading((u) => ({
            ...u,
            [docType]: (u[docType] ?? []).map((x) => (x.key === key ? { ...x, pct } : x)),
          })),
        );
      } catch {
        setError((e) => ({ ...e, [docType]: `Upload failed for ${file.name}. Please try again.` }));
      } finally {
        setUploading((u) => ({ ...u, [docType]: (u[docType] ?? []).filter((x) => x.key !== key) }));
      }
    }
  }

  function onDrop(e: DragEvent, docType: string) {
    e.preventDefault();
    setDragOver(null);
    void handleFiles(docType, e.dataTransfer.files);
  }

  const showMissing = !!errors.documents;

  return (
    <div>
      {errors.documents && (
        <div className="indep-banner flag" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
          <TriangleAlert size={18} style={{ flex: '0 0 auto', marginTop: 1 }} />
          <span style={{ fontWeight: 500 }}>{errors.documents}</span>
        </div>
      )}
      <p className="wiz-sub" style={{ marginTop: 0, marginBottom: 22 }}>
        Upload clear copies as <b>PDF files only</b> (max 10 MB each). You can add{' '}
        <b>multiple files per category</b>. Items marked{' '}
        <span className="req" style={{ color: 'var(--brand)', fontWeight: 700 }}>
          *
        </span>{' '}
        are required. Your <b>profile photo</b>, <b>educational certificates</b> and{' '}
        <b>work-experience documents</b> are collected on the Personal, Education and Employment steps.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {DOC_TYPES.map((dt) => {
          const files = documents.filter((d) => d.docType === dt.id);
          const ups = uploading[dt.id] ?? [];
          const missing = showMissing && dt.req && files.length === 0;
          return (
            <div key={dt.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: missing ? 'var(--brand)' : 'var(--ink-2)' }}>
                  {dt.label}
                  {dt.req && (
                    <span className="req" style={{ color: 'var(--brand)' }}>
                      {' '}
                      *
                    </span>
                  )}
                  {files.length > 0 && (
                    <span className="muted" style={{ marginLeft: 8, fontWeight: 500 }}>
                      · {files.length} file{files.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {missing && (
                    <span style={{ marginLeft: 8, fontWeight: 600, color: 'var(--brand)' }}>· Required</span>
                  )}
                </label>
              </div>
              {dt.hint && (
                <div className="hint" style={{ marginTop: -2, marginBottom: 8 }}>
                  {dt.hint}
                </div>
              )}

              <input
                ref={(el) => {
                  inputs.current[dt.id] = el;
                }}
                type="file"
                multiple
                accept={ACCEPTED_UPLOAD}
                style={{ display: 'none' }}
                onChange={(e) => {
                  void handleFiles(dt.id, e.target.files);
                  e.target.value = '';
                }}
              />

              {/* Uploaded files */}
              {files.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  {files.map((f) => (
                    <div key={f.id} className="doc-file">
                      <div className="df-ic">
                        <FileText size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.originalFilename}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                          {fmtBytes(f.sizeBytes)} · {f.scannedClean ? 'Uploaded' : 'Scanning…'}
                        </div>
                      </div>
                      <button className="iconbtn" style={{ width: 32, height: 32 }} title="Preview" type="button" onClick={() => onPreview(f.id)}>
                        <Eye size={15} />
                      </button>
                      <button className="iconbtn" style={{ width: 32, height: 32 }} title="Remove" type="button" onClick={() => void onRemove(f.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* In-progress uploads */}
              {ups.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  {ups.map((u) => (
                    <div key={u.key} className="doc-file" style={{ alignItems: 'center' }}>
                      <div className="df-ic">
                        <Loader2 size={18} className="spin" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.name}
                        </div>
                        <div className="up-bar">
                          <i style={{ width: `${u.pct}%` }} />
                        </div>
                      </div>
                      <span className="muted" style={{ fontSize: 12, width: 38, textAlign: 'right' }}>
                        {u.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Always-present add zone (drop or browse) */}
              <div
                className={`dropzone${dragOver === dt.id || missing ? ' req-missing' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(dt.id);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => onDrop(e, dt.id)}
              >
                <div className="dz-ic">
                  <Upload size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                    {files.length > 0 ? 'Add more files' : 'Drag & drop or browse'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>PDF only · up to 10 MB each</div>
                </div>
                <button className="btn btn-soft btn-sm" type="button" onClick={() => inputs.current[dt.id]?.click()}>
                  Select files
                </button>
              </div>
              {error[dt.id] && <div className="errmsg" style={{ marginTop: 6 }}>{error[dt.id]}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
