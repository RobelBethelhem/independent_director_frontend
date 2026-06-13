import { Eye, FileText } from 'lucide-react';
import { DOC_DISPLAY_ORDER, docLabel } from '../lib/constants';

interface Doc {
  id: string;
  docType: string;
  originalFilename: string;
}

/** Shows uploaded documents grouped under their category (CV, Educational
 *  certificate, Work experience document, …) so it's clear which file belongs to
 *  which category. Renders any document type present, in a stable order. */
export function GroupedDocs({
  documents,
  onPreview,
  emptyText = 'No documents.',
}: {
  documents: Doc[];
  onPreview: (id: string) => void;
  emptyText?: string;
}) {
  if (!documents.length) return <span className="muted">{emptyText}</span>;
  // Distinct doc types present, ordered by the canonical display order (unknown last).
  const present = Array.from(new Set(documents.map((d) => d.docType))).sort((a, b) => {
    const ia = DOC_DISPLAY_ORDER.indexOf(a);
    const ib = DOC_DISPLAY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {present.map((docType) => {
        const files = documents.filter((d) => d.docType === docType);
        if (!files.length) return null;
        return (
          <div key={docType}>
            <div className="docgroup-h">
              {docLabel(docType)}
              <span className="docgroup-count">{files.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {files.map((f) => (
                <div key={f.id} className="doc-file">
                  <div className="df-ic">
                    <FileText size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.originalFilename}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{docLabel(docType)}</div>
                  </div>
                  <button className="iconbtn" style={{ width: 32, height: 32 }} title="Preview" onClick={() => onPreview(f.id)}>
                    <Eye size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
