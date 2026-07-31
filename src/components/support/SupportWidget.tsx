import { useCallback, useEffect, useRef, useState } from 'react';
import { Headset, Minus } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { supportApi, type SupportMessage } from '../../lib/support-api';
import { SupportChatMessages } from './SupportChatMessages';
import { SupportComposer } from './SupportComposer';

const STAFF_ROLES = ['admin', 'reviewer', 'auditor', 'recommender', 'support'];
const SEEN_KEY = 'zemen.support.seenAt';

/** Floating "Get help" chat, shown on every page to applicants and anonymous
 *  visitors (not staff, who have the console). Polls for replies in real time. */
export function SupportWidget() {
  const { user } = useAuth();
  const authed = !!user;
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [unread, setUnread] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setUnread(false);
  };

  const load = useCallback(async () => {
    try {
      const { messages: msgs } = await (authed ? supportApi.meThread() : supportApi.anonThread());
      setMessages(msgs);
      if (openRef.current) {
        markSeen();
      } else {
        let lastSeen = 0;
        try {
          lastSeen = Number(localStorage.getItem(SEEN_KEY) ?? 0);
        } catch {
          /* ignore */
        }
        setUnread(msgs.some((m) => m.sender === 'support' && new Date(m.createdAt).getTime() > lastSeen));
      }
    } catch {
      /* offline / not signed in yet — ignore */
    }
  }, [authed]);

  useEffect(() => {
    if (isStaff) return;
    let active = true;
    const tick = () => {
      if (active) void load();
    };
    tick();
    const iv = setInterval(tick, open ? 2500 : 25000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [isStaff, open, load]);

  if (isStaff) return null;

  const resolveUrl = async (messageId: string) =>
    (await (authed ? supportApi.meAttachmentUrl(messageId) : supportApi.anonAttachmentUrl(messageId))).url;

  async function afterSend() {
    markSeen();
    await load();
  }
  async function sendText(text: string) {
    await (authed ? supportApi.meSendText(text) : supportApi.anonSendText(text));
    await afterSend();
  }
  async function sendImage(file: File) {
    await (authed ? supportApi.meSendAttachment('image', file, file.name) : supportApi.anonSendAttachment('image', file, file.name));
    await afterSend();
  }
  async function sendVoice(blob: Blob, durationMs: number) {
    const name = 'voice-message';
    await (authed
      ? supportApi.meSendAttachment('voice', blob, name, durationMs)
      : supportApi.anonSendAttachment('voice', blob, name, durationMs));
    await afterSend();
  }

  function openPanel() {
    setOpen(true);
    markSeen();
    void load();
  }

  return (
    <>
      {!open && (
        <button className="sup-fab" onClick={openPanel} aria-label="Get help from support">
          <Headset size={24} />
          {unread && <span className="sup-fab-dot" aria-hidden />}
        </button>
      )}
      {open && (
        <div className="sup-panel fade-up" role="dialog" aria-label="Support chat">
          <div className="sup-head">
            <div className="sup-head-title">
              <Headset size={18} />
              <span>Support</span>
            </div>
            <button className="sup-head-x" onClick={() => setOpen(false)} aria-label="Minimise chat">
              <Minus size={18} />
            </button>
          </div>
          <div className="sup-intro">
            {authed
              ? 'Ask us anything — a support agent replies right here.'
              : 'You’re chatting as a guest. Sign in to link this to your application.'}
          </div>
          <div className="sup-body">
            <SupportChatMessages
              messages={messages}
              mine="user"
              resolveUrl={resolveUrl}
              emptyText="Stuck on something? Send a message — our team will reply here."
            />
          </div>
          <SupportComposer onSendText={sendText} onSendImage={sendImage} onSendVoice={sendVoice} />
        </div>
      )}
    </>
  );
}
