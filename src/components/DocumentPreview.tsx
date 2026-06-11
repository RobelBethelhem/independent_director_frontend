import { useEffect, useState } from 'react';
import { Download, FileText, X } from 'lucide-react';

interface PreviewData {
  url: string;
  mimeType: string;
  filename: string;
}

interface Props {
  /** Fetches the inline preview URL + metadata. */
  loadPreview: () => Promise<PreviewData>;
  /** Fetches a (download-disposition) URL for the Download button. */
  loadDownload: () => Promise<string>;
  title?: string;
  onClose: () => void;
}

/** Reusable in-app document viewer: shows images and PDFs inline (no forced
 *  download), with a Download button. Works for applicant / reviewer / admin —
 *  the caller supplies the role-appropriate API loaders. */
export function DocumentPreview({ loadPreview, loadDownload, title, onClose }: Props) {
  const [state, setState] = useState<PreviewData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadPreview()
      .then((r) => !cancelled && setState(r))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function download() {
    const url = await loadDownload();
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const isImage = state?.mimeType.startsWith('image/');
  const isPdf = state?.mimeType === 'application/pdf';

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="dpv" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dpv-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <FileText size={17} style={{ color: 'var(--brand-700)', flex: '0 0 auto' }} />
            <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title ?? state?.filename ?? 'Document'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => void download()} type="button">
              <Download size={15} /> Download
            </button>
            <button className="iconbtn" onClick={onClose} type="button" title="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="dpv-body">
          {error ? (
            <div className="muted" style={{ padding: 40 }}>Could not load preview.</div>
          ) : !state ? (
            <div className="muted" style={{ padding: 40 }}>Loading preview…</div>
          ) : isImage ? (
            <img src={state.url} alt={state.filename} />
          ) : isPdf ? (
            <iframe title={state.filename} src={state.url} />
          ) : (
            <div className="muted" style={{ padding: 40, textAlign: 'center' }}>
              Preview isn’t available for this file type.
              <br />
              <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={() => void download()}>
                <Download size={15} /> Download instead
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
