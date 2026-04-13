"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function BerichtActions({
  berichtId,
  hasNote,
  hasFormatted,
  pdfPath,
  onUpdated,
  ensureSynced,
  onBusyChange,
}: {
  berichtId: number;
  hasNote: boolean;
  hasFormatted: boolean;
  pdfPath: string | null;
  onUpdated: () => void | Promise<void>;
  ensureSynced?: () => Promise<boolean>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState<"f" | "p" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [kiOk, setKiOk] = useState(false);
  const [pdfOk, setPdfOk] = useState(false);
  const kiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opLock = useRef(false);

  useEffect(() => {
    return () => {
      if (kiTimer.current) clearTimeout(kiTimer.current);
      if (pdfTimer.current) clearTimeout(pdfTimer.current);
    };
  }, []);

  useEffect(() => {
    onBusyChange?.(busy !== null);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  async function formulieren() {
    if (opLock.current) return;
    opLock.current = true;
    setErr(null);
    setKiOk(false);
    setBusy("f");
    try {
      if (ensureSynced) {
        const ok = await ensureSynced();
        if (!ok) {
          setErr("Entwurf konnte nicht gespeichert werden.");
          return;
        }
      }
      const res = await fetch(`/api/berichte/${berichtId}/formulieren`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : "Fehler");
        return;
      }
      await Promise.resolve(onUpdated());
      setKiOk(true);
      if (kiTimer.current) clearTimeout(kiTimer.current);
      kiTimer.current = setTimeout(() => setKiOk(false), 5000);
    } catch {
      setErr("Unerwarteter Fehler.");
    } finally {
      setBusy(null);
      opLock.current = false;
    }
  }

  async function pdf() {
    if (opLock.current) return;
    opLock.current = true;
    setErr(null);
    setPdfOk(false);
    setBusy("p");
    try {
      if (ensureSynced) {
        const ok = await ensureSynced();
        if (!ok) {
          setErr("Entwurf konnte nicht gespeichert werden.");
          return;
        }
      }
      const res = await fetch(`/api/berichte/${berichtId}/pdf`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : "Fehler");
        return;
      }
      await Promise.resolve(onUpdated());
      setPdfOk(true);
      if (pdfTimer.current) clearTimeout(pdfTimer.current);
      pdfTimer.current = setTimeout(() => setPdfOk(false), 5000);
    } catch {
      setErr("Unerwarteter Fehler.");
    } finally {
      setBusy(null);
      opLock.current = false;
    }
  }

  const blocked = busy !== null;

  return (
    <div className="space-y-3">
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {kiOk ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          Text optimiert
        </p>
      ) : null}
      {pdfOk ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          PDF erstellt
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!hasNote || blocked} onClick={() => void formulieren()}>
          {busy === "f" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span className="ml-2">KI arbeitet …</span>
            </>
          ) : (
            "Text mit KI optimieren"
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!hasFormatted || blocked}
          onClick={() => void pdf()}
        >
          {busy === "p" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span className="ml-2">PDF wird erstellt …</span>
            </>
          ) : (
            "PDF erzeugen"
          )}
        </Button>
        {pdfPath ? (
          <a
            href={pdfPath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            PDF öffnen
          </a>
        ) : null}
      </div>
    </div>
  );
}
