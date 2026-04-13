"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = { onText: (t: string) => void; prominent?: boolean };

export function SprachEingabe({ onText, prominent }: Props) {
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [rec, setRec] = useState(false);
  const [load, setLoad] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const send = useCallback(
    async (blob: Blob, mime: string) => {
      setLoad(true);
      setErr(null);
      try {
        const fd = new FormData();
        fd.append("audio", new File([blob], "a.webm", { type: mime || "audio/webm" }));
        const res = await fetch("/api/whisper", { method: "POST", body: fd });
        const j = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
        if (!res.ok) {
          setErr(j.error ?? "Fehler");
          return;
        }
        const t = (j.text ?? "").trim();
        if (t) onText(t);
        else setErr("Kein Text.");
      } catch {
        setErr("Netzwerk");
      } finally {
        setLoad(false);
      }
    },
    [onText]
  );

  const stop = useCallback(() => {
    recRef.current?.stop();
    setRec(false);
  }, []);

  const start = useCallback(async () => {
    setErr(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("Kein Mikrofon.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunks.current = [];
      const mr = new MediaRecorder(stream);
      recRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      mr.onstop = () => {
        stopStream();
        recRef.current = null;
        const parts = chunks.current;
        chunks.current = [];
        if (!parts.length) return;
        const blob = new Blob(parts, { type: mr.mimeType || "audio/webm" });
        void send(blob, mr.mimeType || "audio/webm");
      };
      mr.start();
      setRec(true);
    } catch {
      setErr("Zugriff verweigert.");
    }
  }, [send, stopStream]);

  const inner = (
    <>
      <div className="flex flex-wrap gap-2">
        {!rec ? (
          <Button
            type="button"
            variant={prominent ? "primary" : "secondary"}
            disabled={load}
            className={prominent ? "min-h-12 px-6 text-base" : ""}
            onClick={() => void start()}
          >
            {load ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className={prominent ? "h-5 w-5" : "h-4 w-4"} />}
            <span className="ml-2">{load ? "Wird erkannt …" : prominent ? "Aufnahme starten" : "Sprache"}</span>
          </Button>
        ) : (
          <Button type="button" variant="primary" className={prominent ? "min-h-12 px-6 text-base" : ""} onClick={stop}>
            Aufnahme beenden
          </Button>
        )}
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
    </>
  );

  if (prominent) {
    return (
      <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-b from-blue-50/80 to-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Spracheingabe</p>
        <p className="mt-1 text-sm text-slate-600">Diktieren, Text landet unten im Feld — dort beliebig bearbeiten.</p>
        <div className="mt-4">{inner}</div>
      </div>
    );
  }

  return <div className="flex flex-col gap-2">{inner}</div>;
}
