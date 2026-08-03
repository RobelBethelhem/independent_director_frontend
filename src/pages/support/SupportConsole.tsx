import { useCallback, useEffect, useRef, useState } from 'react';
import { Headset, MessageSquare } from 'lucide-react';
import { supportApi, type SupportMessage, type SupportThreadListItem } from '../../lib/support-api';
import { SupportChatMessages } from '../../components/support/SupportChatMessages';
import { SupportComposer } from '../../components/support/SupportComposer';
import { notifyDesktop, playIncomingChime, requestNotifyPermission, unlockChime } from '../../lib/support-notify';

function fmtWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString();
}

/** Support-agent console: live list of conversations + reply pane. Support & admin roles. */
export function SupportConsole() {
  const [threads, setThreads] = useState<SupportThreadListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;
  // Last seen "thread id → lastMessageAt" snapshot, so each poll can tell which
  // conversations gained a new visitor message since the previous poll.
  const prevSnapRef = useRef<Map<string, string>>(new Map());
  const seededRef = useRef(false);
  const titleRef = useRef('');

  const loadThreads = useCallback(async () => {
    let list: SupportThreadListItem[];
    try {
      list = await supportApi.threads();
    } catch {
      return;
    }
    setThreads(list);

    // Alert the agent about newly-arrived visitor messages (chime + desktop
    // notification + tab-title flash). Only messages sent by the visitor count
    // — the agent's own replies must not ring their own bell.
    const snap = new Map<string, string>();
    let incoming: SupportThreadListItem | null = null;
    for (const t of list) {
      if (t.lastMessageAt) snap.set(t.id, t.lastMessageAt);
      const changed = t.lastMessageAt != null && t.lastMessageAt !== prevSnapRef.current.get(t.id);
      if (changed && t.lastMessageBy === 'user' && !incoming) incoming = t;
    }
    // seededRef skips the very first load so opening the console doesn't ring
    // for every conversation already sitting in the list.
    if (seededRef.current && incoming) {
      playIncomingChime();
      notifyDesktop(
        incoming.isGuest ? 'New message from a visitor' : `New message from ${incoming.displayName}`,
        incoming.preview ?? 'Open the support console to reply.',
      );
      if (document.hidden && titleRef.current) document.title = '🔔 New support message';
    }
    prevSnapRef.current = snap;
    seededRef.current = true;
  }, []);

  // Unlock the chime + request desktop-notification permission on the agent's
  // first interaction (browsers require a user gesture for both).
  useEffect(() => {
    const onGesture = () => {
      unlockChime();
      requestNotifyPermission();
    };
    window.addEventListener('pointerdown', onGesture, { once: true });
    window.addEventListener('keydown', onGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, []);

  // Restore the tab title once the agent looks back at the console.
  useEffect(() => {
    titleRef.current = document.title;
    const restore = () => {
      if (!document.hidden) document.title = titleRef.current;
    };
    document.addEventListener('visibilitychange', restore);
    window.addEventListener('focus', restore);
    return () => {
      document.removeEventListener('visibilitychange', restore);
      window.removeEventListener('focus', restore);
      document.title = titleRef.current;
    };
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const { messages: msgs } = await supportApi.thread(id);
      if (activeRef.current === id) setMessages(msgs);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadThreads();
    const iv = setInterval(loadThreads, 4000);
    return () => clearInterval(iv);
  }, [loadThreads]);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
    const iv = setInterval(() => loadMessages(activeId), 2500);
    return () => clearInterval(iv);
  }, [activeId, loadMessages]);

  const resolveUrl = async (messageId: string) => (await supportApi.threadAttachmentUrl(activeId!, messageId)).url;

  async function sendText(text: string) {
    await supportApi.reply(activeId!, text);
    await loadMessages(activeId!);
    await loadThreads();
  }
  async function sendImage(file: File) {
    await supportApi.replyAttachment(activeId!, 'image', file, file.name);
    await loadMessages(activeId!);
  }
  async function sendVoice(blob: Blob, durationMs: number) {
    await supportApi.replyAttachment(activeId!, 'voice', blob, 'voice-message', durationMs);
    await loadMessages(activeId!);
  }

  const active = threads.find((t) => t.id === activeId) ?? null;

  return (
    <div className="page">
      <div className="wrap">
        <div className="page-head">
          <h1>
            <Headset size={22} style={{ verticalAlign: '-3px', marginRight: 8 }} />
            Support
          </h1>
          <p className="muted">Applicants and visitors can reach you here. Reply with text, an image, or a voice note.</p>
        </div>

        <div className="sup-console">
          <div className="sup-threads">
            {threads.length === 0 ? (
              <div className="sup-empty" style={{ padding: 24 }}>No conversations yet.</div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  className={`sup-thread${t.id === activeId ? ' active' : ''}`}
                  onClick={() => {
                    setActiveId(t.id);
                    setMessages([]);
                  }}
                >
                  <div className="sup-thread-top">
                    <span className="sup-thread-name">
                      {t.displayName}
                      {t.isGuest && <span className="sup-guest">guest</span>}
                    </span>
                    <span className="sup-thread-when">{fmtWhen(t.lastMessageAt)}</span>
                  </div>
                  <div className="sup-thread-bottom">
                    <span className="sup-thread-preview">{t.preview ?? '—'}</span>
                    {t.needsReply && <span className="sup-badge">new</span>}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="sup-conv">
            {active ? (
              <>
                <div className="sup-conv-head">
                  {active.displayName}
                  {active.isGuest && <span className="sup-guest">guest</span>}
                </div>
                <div className="sup-conv-body">
                  <SupportChatMessages messages={messages} mine="support" resolveUrl={resolveUrl} emptyText="No messages." />
                </div>
                <SupportComposer onSendText={sendText} onSendImage={sendImage} onSendVoice={sendVoice} />
              </>
            ) : (
              <div className="sup-conv-empty">
                <MessageSquare size={26} />
                <span>Select a conversation to reply.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
