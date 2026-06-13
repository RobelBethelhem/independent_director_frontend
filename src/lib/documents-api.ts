import { api } from './api';

export interface DocumentRecord {
  id: string;
  docType: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  scannedClean: boolean;
  uploadedAt: string;
  educationEntryId?: string | null;
  employmentEntryId?: string | null;
}

/** Optional soft link tying a file to a specific education / employment entry. */
export interface DocLink {
  educationEntryId?: string;
  employmentEntryId?: string;
}

interface PresignResult {
  uploadUrl: string;
  storageKey: string;
}

/** PUT a file to a presigned URL via XHR so we get real upload progress events. */
function putWithProgress(url: string, file: File, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}

export const documentsApi = {
  list(appId: string) {
    return api<DocumentRecord[]>(`/applications/${appId}/documents`);
  },

  /**
   * Full upload: presign → PUT bytes straight to object storage → record metadata.
   * The file never passes through the API server. `onProgress` reports the upload
   * percentage (0–100) of the storage PUT so the UI can show a progress bar.
   */
  async upload(
    appId: string,
    docType: string,
    file: File,
    onProgress?: (percent: number) => void,
    link?: DocLink,
  ): Promise<DocumentRecord> {
    const { uploadUrl, storageKey } = await api<PresignResult>(
      `/applications/${appId}/documents/presign`,
      {
        method: 'POST',
        body: { docType, filename: file.name, mime: file.type, size: file.size },
      },
    );

    await putWithProgress(uploadUrl, file, onProgress);

    return api<DocumentRecord>(`/applications/${appId}/documents`, {
      method: 'POST',
      body: {
        docType,
        storageKey,
        originalFilename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        ...(link?.educationEntryId ? { educationEntryId: link.educationEntryId } : {}),
        ...(link?.employmentEntryId ? { employmentEntryId: link.employmentEntryId } : {}),
      },
    });
  },

  remove(appId: string, docId: string) {
    return api<{ ok: true }>(`/applications/${appId}/documents/${docId}`, { method: 'DELETE' });
  },

  async download(appId: string, docId: string) {
    const { url } = await api<{ url: string }>(`/applications/${appId}/documents/${docId}/download`);
    return url;
  },

  /** Inline URL + metadata for in-app preview (image/PDF viewer). */
  preview(appId: string, docId: string) {
    return api<{ url: string; mimeType: string; filename: string }>(
      `/applications/${appId}/documents/${docId}/preview`,
    );
  },
};
