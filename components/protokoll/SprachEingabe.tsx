"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic } from "lucide-react";

function pickRecorderMime(): { mime: string; ext: string } {
  const candidates: { mime: string; ext: string }[] = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/mp4", ext: "mp4" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) {
      return c;
    }
  }
  return { mime: "audio/webm", ext: "webm" };
}

type Props = {
  /** Transkript an die Notiz anhängen bzw. setzen */
  onTranscript: (text: string) => void;
};

export function SprachEingabe({ onTranscript }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [successHint, setSuccessHint] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const sendBlob = useCallback(
    async (blob: Blob, filename: string, mime: string) => {
      setIsLoading(true);
      setPermissionError(null);
      setSuccessHint(false);
      try {
        const fd = new FormData();
        const file =
          typeof File !== "undefined"
            ? new File([blob], filename, { type: mime })
            : blob;
        fd.append("audio", file);

        const res = await fetch("/api/whisper", {
          method: "POST",
          body: fd,
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setPermissionError(
            typeof j.error === "string" ? j.error : "Transkription fehlgeschlagen."
          );
          return;
        }
        const text = typeof j.text === "string" ? j.text.trim() : "";
        if (text) {
          onTranscript(text);
          setSuccessHint(true);
        } else {
          setPermissionError("Kein Text erkannt. Bitte erneut sprechen.");
        }
      } catch {
        setPermissionError("Netzwerkfehler bei der Transkription.");
      } finally {
        setIsLoading(false);
      }
    },
    [onTranscript]
  );

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") {
      setIsRecording(false);
      return;
    }
    rec.stop();
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setPermissionError(null);
    setSuccessHint(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError("Mikrofon wird in diesem Browser nicht unterstützt.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mime, ext } = pickRecorderMime();
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
        const useExt = outMime.includes("mp4") ? "mp4" : ext;
        void sendBlob(blob, `recording.${useExt}`, outMime);
      };

      rec.start(200);
      setIsRecording(true);
    } catch {
      setPermissionError(
        "Mikrofon-Zugriff verweigert oder nicht verfügbar. Bitte in den Browser-Einstellungen erlauben."
      );
    }
  }, [sendBlob, stopStream]);

  const toggle = useCallback(() => {
    if (isLoading) return;
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isLoading, isRecording, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== "inactive") {
        rec.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-[76px] w-[76px] items-center justify-center">
        {isRecording ? (
          <span
            className="absolute inset-0 rounded-full bg-red-500/30 animate-ping"
            aria-hidden
          />
        ) : null}
        <button
          type="button"
          onClick={toggle}
          disabled={isLoading}
          aria-label={isRecording ? "Aufnahme stoppen" : "Spracheingabe starten"}
          aria-pressed={isRecording}
          className={`relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-lg transition focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 disabled:opacity-60 ${
            isRecording
              ? "bg-red-600 text-white focus-visible:ring-red-400"
              : "bg-slate-400 text-white hover:bg-slate-500 focus-visible:ring-slate-400"
          }`}
        >
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          ) : (
            <Mic className="h-8 w-8" aria-hidden />
          )}
        </button>
      </div>
      <p className="max-w-[200px] text-center text-xs text-slate-500">
        Tippen oder sprechen
      </p>
      {permissionError ? (
        <p className="max-w-[220px] text-center text-xs text-red-600" role="alert">
          {permissionError}
        </p>
      ) : null}
      {successHint && !permissionError ? (
        <p className="max-w-[220px] text-center text-xs text-green-700" role="status">
          ✓ Sprache erkannt — du kannst den Text noch anpassen
        </p>
      ) : null}
    </div>
  );
}
