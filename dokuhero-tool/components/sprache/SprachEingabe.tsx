"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Mic } from "lucide-react";

function pickRecorderMime(): { mime: string; ext: string } {
  const candidates = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) {
      return c;
    }
  }
  return { mime: "audio/webm", ext: "webm" };
}

type Props = { onTranscript: (text: string) => void };

export function SprachEingabe({ onTranscript }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const sendBlob = useCallback(
    async (blob: Blob, filename: string, mime: string) => {
      setLoading(true);
      setErr(null);
      try {
        const fd = new FormData();
        fd.append(
          "audio",
          typeof File !== "undefined" ? new File([blob], filename, { type: mime }) : blob
        );
        const res = await fetch("/api/whisper", { method: "POST", body: fd });
        const j = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
        if (!res.ok) {
          setErr(typeof j.error === "string" ? j.error : "Transkription fehlgeschlagen.");
          return;
        }
        const text = typeof j.text === "string" ? j.text.trim() : "";
        if (text) onTranscript(text);
        else setErr("Kein Text erkannt.");
      } catch {
        setErr("Netzwerkfehler.");
      } finally {
        setLoading(false);
      }
    },
    [onTranscript]
  );

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") {
      setRecording(false);
      return;
    }
    rec.stop();
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setErr(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("Mikrofon nicht unterstützt.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mime } = pickRecorderMime();
      chunksRef.current = [];
      const rec = MediaRecorder.isTypeSupported(mime)
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      const outMime = rec.mimeType || mime;
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stopStream();
        mediaRecorderRef.current = null;
        const parts = chunksRef.current;
        chunksRef.current = [];
        if (parts.length === 0) return;
        const blob = new Blob(parts, { type: outMime });
        void sendBlob(blob, `audio.${pickRecorderMime().ext}`, outMime);
      };
      rec.start();
      setRecording(true);
    } catch {
      setErr("Mikrofon-Zugriff verweigert.");
    }
  }, [sendBlob, stopStream]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (recording ? stopRecording() : void startRecording())}
          disabled={loading}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white ${
            recording ? "bg-red-600 hover:bg-red-700" : "bg-slate-800 hover:bg-slate-900"
          } disabled:opacity-50`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {loading ? "…" : recording ? "Stop" : "Sprache"}
        </button>
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
    </div>
  );
}
