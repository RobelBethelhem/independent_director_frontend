import { useEffect, useRef, useState } from 'react';
import type { SupportMessage, SupportSender } from '../../lib/support-api';

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDur(ms: number | null): string {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Renders a support conversation. `mine` is which sender is "us" (right-aligned).
 *  `resolveUrl` fetches a short-lived URL for an image/voice attachment by id. */
export function SupportChatMessages({
  messages,
  mine,
  resolveUrl,
  emptyText,
}: {
  messages: SupportMessage[];
  mine: SupportSender;
  resolveUrl: (messageId: string) => Promise<string>;
  emptyText?: string;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    messages.forEach((m) => {
      if ((m.kind === 'image' || m.kind === 'voice') && !urls[m.id]) {
        resolveUrl(m.id)
          .then((u) => {
            if (!cancelled) setUrls((prev) => ({ ...prev, [m.id]: u }));
          })
          .catch(() => undefined);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  if (!messages.length) {
    return <div className="sup-empty">{emptyText ?? 'No messages yet.'}</div>;
  }

  return (
    <>
      {messages.map((m) => {
        const own = m.sender === mine;
        return (
          <div key={m.id} className={`sup-row ${own ? 'own' : 'other'}`}>
            <div className={`sup-bubble ${own ? 'own' : 'other'}`}>
              {m.kind === 'text' && <div className="sup-msg-text">{m.text}</div>}
              {m.kind === 'image' &&
                (urls[m.id] ? (
                  <a href={urls[m.id]} target="_blank" rel="noopener noreferrer">
                    <img className="sup-img" src={urls[m.id]} alt="attachment" />
                  </a>
                ) : (
                  <div className="sup-att-loading">Loading image…</div>
                ))}
              {m.kind === 'voice' &&
                (urls[m.id] ? (
                  <audio className="sup-audio" controls preload="none" src={urls[m.id]} />
                ) : (
                  <div className="sup-att-loading">Loading voice note…</div>
                ))}
              {m.kind !== 'text' && m.text && <div className="sup-msg-text" style={{ marginTop: 6 }}>{m.text}</div>}
              <div className="sup-time">
                {fmtTime(m.createdAt)}
                {m.kind === 'voice' && m.durationMs ? ` · ${fmtDur(m.durationMs)}` : ''}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </>
  );
}
