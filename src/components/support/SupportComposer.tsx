import { useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { Image as ImageIcon, Mic, Send, Trash2 } from 'lucide-react';
import { canRecordAudio, useVoiceRecorder } from './useVoiceRecorder';

/** Message composer shared by the applicant widget and the support console:
 *  text, image attach, and hold-to-record voice (where the mic is available). */
export function SupportComposer({
  onSendText,
  onSendImage,
  onSendVoice,
  disabled,
}: {
  onSendText: (text: string) => Promise<void>;
  onSendImage: (file: File) => Promise<void>;
  onSendVoice: (blob: Blob, durationMs: number) => Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { recording, seconds, start, stop } = useVoiceRecorder(async (blob, durationMs) => {
    setBusy(true);
    try {
      await onSendVoice(blob, durationMs);
    } finally {
      setBusy(false);
    }
  });

  async function submitText(e?: FormEvent) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || busy || disabled) return;
    setBusy(true);
    setText('');
    try {
      await onSendText(t);
    } catch {
      setText(t);
    } finally {
      setBusy(false);
    }
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await onSendImage(file);
    } finally {
      setBusy(false);
    }
  }

  function holdStart(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    void start();
  }

  if (recording) {
    return (
      <div className="sup-composer recording">
        <span className="sup-rec-dot" aria-hidden />
        <span className="sup-rec-time">
          Recording… {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
        </span>
        <div style={{ flex: 1 }} />
        <button type="button" className="sup-ic danger" onClick={() => stop(true)} title="Cancel">
          <Trash2 size={18} />
        </button>
        <button type="button" className="sup-send" onClick={() => stop(false)} title="Send voice note">
          <Send size={16} />
        </button>
      </div>
    );
  }

  const hasText = text.trim().length > 0;
  return (
    <form className="sup-composer" onSubmit={submitText}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          void pickImage(e.target.files?.[0] ?? undefined);
          e.target.value = '';
        }}
      />
      <button type="button" className="sup-ic" disabled={busy || disabled} onClick={() => fileRef.current?.click()} title="Attach an image">
        <ImageIcon size={18} />
      </button>
      <input
        className="sup-input"
        value={text}
        disabled={busy || disabled}
        placeholder="Type a message…"
        onChange={(e) => setText(e.target.value)}
      />
      {hasText ? (
        <button type="submit" className="sup-send" disabled={busy || disabled} title="Send">
          <Send size={16} />
        </button>
      ) : canRecordAudio ? (
        <button
          type="button"
          className="sup-ic mic"
          disabled={busy || disabled}
          onPointerDown={holdStart}
          onPointerUp={() => stop(false)}
          onPointerCancel={() => stop(true)}
          title="Hold to record a voice note"
        >
          <Mic size={18} />
        </button>
      ) : (
        <button type="submit" className="sup-send" disabled title="Type a message to send">
          <Send size={16} />
        </button>
      )}
    </form>
  );
}
