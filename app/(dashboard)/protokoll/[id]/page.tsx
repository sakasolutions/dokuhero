"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileDown, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { FotoEintrag, Protokoll } from "@/types";

type ApiResponse = {
  protokoll: Protokoll;
  kunde_name: string | null;
  kunde_email: string | null;
  auftrag_beschreibung: string | null;
  fotos: FotoEintrag[];
};

function formatDate(d: string | Date | null) {
  if (d == null) return "–";
  try {
    return new Date(d).toLocaleString("de-DE", {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return "–";
  }
}

export default function ProtokollAnsichtPage() {
  const params = useParams();
  const id = String(params.id);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/protokoll/${id}`);
    if (!res.ok) {
      setError("Protokoll nicht gefunden.");
      setData(null);
      return;
    }
    const j = (await res.json()) as ApiResponse;
    setData(j);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function handleGenerate() {
    setGenMessage(null);
    setGenError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/protokoll/${id}/generate`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGenError(
          typeof j.error === "string" ? j.error : "Generierung fehlgeschlagen."
        );
        return;
      }
      const emailSent = Boolean(j.emailSent);
      const email = data?.kunde_email?.trim();
      if (emailSent && email) {
        setGenMessage(`PDF wurde an ${email} gesendet.`);
      } else {
        setGenMessage("PDF erstellt.");
      }
      await load();
    } catch {
      setGenError("Netzwerkfehler.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <p className="text-slate-600">Laden…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <p className="text-red-600">{error ?? "Unbekannter Fehler"}</p>
        <Link href="/auftraege" className="text-primary hover:underline">
          Zurück zu Aufträgen
        </Link>
      </div>
    );
  }

  const { protokoll, kunde_name, kunde_email, auftrag_beschreibung, fotos } =
    data;
  const pdfHref = protokoll.pdf_pfad ?? undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-24">
      <Link
        href="/auftraege"
        className="inline-flex min-h-12 items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-5 w-5" />
        Zurück zu Aufträgen
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Protokoll</h1>
        <p className="text-slate-600">
          {formatDate(protokoll.erstellt_am)}
          {kunde_name ? ` · ${kunde_name}` : null}
        </p>
      </div>

      {genError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {genError}
        </p>
      ) : null}
      {genMessage ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {genMessage}
        </p>
      ) : null}

      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-500">
              Auftragsbeschreibung
            </h2>
            <p className="mt-1 text-slate-800">
              {auftrag_beschreibung ?? "–"}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-500">Notiz</h2>
            <p className="mt-1 whitespace-pre-wrap text-slate-800">
              {protokoll.notiz?.trim() ? protokoll.notiz : "–"}
            </p>
          </div>
          {protokoll.ki_text?.trim() ? (
            <div>
              <h2 className="text-sm font-semibold text-slate-500">
                KI-Protokolltext
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-slate-800">
                {protokoll.ki_text}
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      {fotos.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-500">Fotos</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {fotos.map((f) => (
              <a
                key={f.id}
                href={f.datei_pfad}
                target="_blank"
                rel="noreferrer"
                className="aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.datei_pfad}
                  alt={f.dateiname}
                  className="h-full w-full object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          className="min-h-12 w-full gap-2 text-base"
          disabled={generating}
          onClick={() => void handleGenerate()}
        >
          {generating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {generating ? "Wird erstellt…" : "PDF generieren & per Mail senden"}
        </Button>

        {pdfHref ? (
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-800 hover:bg-slate-50"
          >
            <FileDown className="h-5 w-5" />
            PDF öffnen / herunterladen
          </a>
        ) : (
          <p className="text-center text-sm text-slate-500">
            Nach der Generierung erscheint hier der PDF-Link.
          </p>
        )}
      </div>

      {protokoll.gesendet_am ? (
        <p className="text-center text-xs text-slate-500">
          Zuletzt gesendet: {formatDate(protokoll.gesendet_am)}
        </p>
      ) : null}
    </div>
  );
}
