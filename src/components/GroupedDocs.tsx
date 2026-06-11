import { Eye, FileText } from 'lucide-react';
import { DOC_TYPES } from '../lib/constants';

interface Doc {
  id: string;
  docType: string;
  originalFilename: string;
}

/** Shows uploaded documents grouped under their category (CV, Educational
 *  certificates, …) so it's clear which file belongs to which category. */
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {DOC_TYPES.map((dt) => {
        const files = documents.filter((d) => d.docType === dt.id);
        if (!files.length) return null;
        return (
          <div key={dt.id}>
            <div className="docgroup-h">
              {dt.label}
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
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{dt.label}</div>
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
