import { api } from './api';

export type SupportSender = 'user' | 'support';
export type SupportKind = 'text' | 'image' | 'voice';

export interface SupportMessage {
  id: string;
  sender: SupportSender;
  kind: SupportKind;
  text: string | null;
  mimeType: string | null;
  originalFilename: string | null;
  durationMs: number | null;
  createdAt: string;
}
export interface SupportThreadInfo {
  id: string;
  displayName: string;
  closed: boolean;
  lastMessageAt: string | null;
  lastMessageBy: SupportSender | null;
}
export interface SupportThreadListItem extends SupportThreadInfo {
  isGuest: boolean;
  preview: string | null;
  needsReply: boolean;
}
export interface ThreadPayload {
  thread: SupportThreadInfo | null;
  messages: SupportMessage[];
}

const ANON_KEY = 'zemen.support.anon';
const ANON_RE = /^[A-Za-z0-9_-]{16,80}$/;

/** Stable, unguessable id for an anonymous visitor's thread (magic-link style).
 *  Uses getRandomValues (available on plain HTTP, unlike crypto.randomUUID). */
export function anonId(): string {
  let id = '';
  try {
    id = localStorage.getItem(ANON_KEY) ?? '';
  } catch {
    /* ignore */
  }
  if (!ANON_RE.test(id)) {
    id = genId();
    try {
      localStorage.setItem(ANON_KEY, id);
    } catch {
      /* ignore */
    }
  }
  return id;
}

function genId(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Content types with any `;codecs=…` suffix stripped so they match the server allowlist. */
function baseMime(file: Blob, fallback: string): string {
  return (file.type || fallback).split(';')[0].trim();
}

async function putFile(url: string, file: Blob, contentType: string): Promise<void> {
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}

export const supportApi = {
  // ---------- Signed-in applicant ----------
  meThread() {
    return api<ThreadPayload>('/support/me');
  },
  meSendText(text: string) {
    return api<SupportMessage>('/support/me/messages', { method: 'POST', body: { kind: 'text', text } });
  },
  async meSendAttachment(kind: 'image' | 'voice', file: Blob, filename: string, durationMs?: number) {
    const mime = baseMime(file, kind === 'voice' ? 'audio/webm' : 'image/png');
    const { storageKey, uploadUrl } = await api<{ storageKey: string; uploadUrl: string }>(
      '/support/me/attachments/presign',
      { method: 'POST', body: { kind, mime, size: file.size } },
    );
    await putFile(uploadUrl, file, mime);
    return api<SupportMessage>('/support/me/messages', {
      method: 'POST',
      body: { kind, storageKey, mimeType: mime, originalFilename: filename, durationMs },
    });
  },
  meAttachmentUrl(messageId: string) {
    return api<{ url: string; mimeType: string | null }>(`/support/me/attachments/${messageId}`);
  },

  // ---------- Anonymous visitor ----------
  anonThread() {
    return api<ThreadPayload>('/support/anon', { method: 'POST', body: { anonId: anonId() }, auth: false });
  },
  anonSendText(text: string) {
    return api<SupportMessage>('/support/anon/messages', {
      method: 'POST',
      body: { anonId: anonId(), kind: 'text', text },
      auth: false,
    });
  },
  async anonSendAttachment(kind: 'image' | 'voice', file: Blob, filename: string, durationMs?: number) {
    const mime = baseMime(file, kind === 'voice' ? 'audio/webm' : 'image/png');
    const { storageKey, uploadUrl } = await api<{ storageKey: string; uploadUrl: string }>(
      '/support/anon/attachments/presign',
      { method: 'POST', body: { anonId: anonId(), kind, mime, size: file.size }, auth: false },
    );
    await putFile(uploadUrl, file, mime);
    return api<SupportMessage>('/support/anon/messages', {
      method: 'POST',
      body: { anonId: anonId(), kind, storageKey, mimeType: mime, originalFilename: filename, durationMs },
      auth: false,
    });
  },
  anonAttachmentUrl(messageId: string) {
    return api<{ url: string; mimeType: string | null }>('/support/anon/attachments/url', {
      method: 'POST',
      body: { anonId: anonId(), messageId },
      auth: false,
    });
  },

  // ---------- Support console ----------
  threads() {
    return api<SupportThreadListItem[]>('/support/threads');
  },
  thread(id: string) {
    return api<{ thread: SupportThreadInfo; messages: SupportMessage[] }>(`/support/threads/${id}`);
  },
  reply(id: string, text: string) {
    return api<SupportMessage>(`/support/threads/${id}/messages`, { method: 'POST', body: { kind: 'text', text } });
  },
  async replyAttachment(id: string, kind: 'image' | 'voice', file: Blob, filename: string, durationMs?: number) {
    const mime = baseMime(file, kind === 'voice' ? 'audio/webm' : 'image/png');
    const { storageKey, uploadUrl } = await api<{ storageKey: string; uploadUrl: string }>(
      `/support/threads/${id}/attachments/presign`,
      { method: 'POST', body: { kind, mime, size: file.size } },
    );
    await putFile(uploadUrl, file, mime);
    return api<SupportMessage>(`/support/threads/${id}/messages`, {
      method: 'POST',
      body: { kind, storageKey, mimeType: mime, originalFilename: filename, durationMs },
    });
  },
  threadAttachmentUrl(threadId: string, messageId: string) {
    return api<{ url: string; mimeType: string | null }>(`/support/threads/${threadId}/attachments/${messageId}`);
  },
  close(id: string) {
    return api<{ ok: true }>(`/support/threads/${id}/close`, { method: 'POST' });
  },
};
