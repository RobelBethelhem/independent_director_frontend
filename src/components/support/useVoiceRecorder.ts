import { useCallback, useEffect, useRef, useState } from 'react';

/** True only where the browser can capture the microphone — needs a secure
 *  context (HTTPS or localhost). Plain-HTTP internal access can't record. */
export const canRecordAudio =
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === 'function' &&
  typeof MediaRecorder !== 'undefined';

/** Hold-to-record voice capture. `onComplete` fires with the audio blob unless
 *  the recording was cancelled or too short. */
export function useVoiceRecorder(onComplete: (blob: Blob, durationMs: number) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const cancelRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const start = useCallback(async () => {
    if (!canRecordAudio || recorderRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearTimer();
        const durationMs = Date.now() - startedRef.current;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        recorderRef.current = null;
        setRecording(false);
        setSeconds(0);
        if (!cancelRef.current && blob.size > 0 && durationMs > 600) onComplete(blob, durationMs);
      };
      startedRef.current = Date.now();
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setRecording(false);
    }
  }, [onComplete]);

  const stop = useCallback((cancel = false) => {
    cancelRef.current = cancel;
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  useEffect(
    () => () => {
      clearTimer();
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
    },
    [],
  );

  return { recording, seconds, start, stop };
}
