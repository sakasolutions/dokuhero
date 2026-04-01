"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileDown,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
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

type Busy = null | "preview" | "pdf" | "mail";

export default function ProtokollAnsichtPage() {
  const params = useParams();
  const id = String(params.id);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kiTextDraft, setKiTextDraft] = useState("");
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [stepPdf, setStepPdf] = useState(false);
  const [pdfCacheBust, setPdfCacheBust] = useState(0);

  const [busy, setBusy] = useState<Busy>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    if (!data) return;
    setKiTextDraft(data.protokoll.ki_text ?? "");
    if (data.protokoll.pdf_pfad) {
      setStepPdf(true);
    }
  }, [data]);

  const hasKiText = kiTextDraft.trim().length > 0;

  async function postPreview() {
    setBannerError(null);
    setBannerSuccess(null);
    setBusy("preview");
    try {
      const res = await fetch(`/api/protokoll/${id}/preview`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBannerError(
          typeof j.error === "string" ? j.error : "Textgenerierung fehlgeschlagen."
        );
        return;
      }
      if (typeof j.kiText === "string") {
        setKiTextDraft(j.kiText);
        setBannerSuccess("Protokolltext wurde erstellt. Du kannst ihn bei Bedarf anpassen.");
      }
      await load();
    } catch {
      setBannerError("Netzwerkfehler.");
    } finally {
      setBusy(null);
    }
  }

  /** Neu aus Notiz (ohne Feedback) oder mit Feedback + aktuellem Text an die Preview-API. */
  async function postPreviewRegenerate() {
    setBannerError(null);
    setBannerSuccess(null);
    setBusy("preview");
    try {
      const fb = feedbackDraft.trim();
      const reqInit: RequestInit = { method: "POST" };
      if (fb) {
        reqInit.headers = { "Content-Type": "application/json" };
        reqInit.body = JSON.stringify({
          feedback: fb,
          previousText: kiTextDraft,
        });
      }
      const res = await fetch(`/api/protokoll/${id}/preview`, reqInit);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBannerError(
          typeof j.error === "string"
            ? j.error
            : "Textgenerierung fehlgeschlagen."
        );
        return;
      }
      if (typeof j.kiText === "string") {
        setKiTextDraft(j.kiText);
        setFeedbackDraft("");
        setBannerSuccess(
          fb
            ? "Protokolltext wurde an dein Feedback angepasst."
            : "Protokolltext wurde neu generiert."
        );
      }
      await load();
    } catch {
      setBannerError("Netzwerkfehler.");
    } finally {
      setBusy(null);
    }
  }

  async function postGenerate(sendMail: boolean) {
    setBannerError(null);
    setBannerSuccess(null);
    setBusy(sendMail ? "mail" : "pdf");
    try {
      const res = await fetch(`/api/protokoll/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kiText: kiTextDraft, sendMail }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBannerError(
          typeof j.error === "string"
            ? j.error
            : "PDF-Erstellung fehlgeschlagen."
        );
        return;
      }
      setPdfCacheBust((n) => n + 1);
      if (sendMail) {
        if (j.emailSent) {
          const email = data?.kunde_email?.trim();
          setBannerSuccess(
            email
              ? `PDF wurde erstellt und an ${email} gesendet.`
              : "PDF wurde erstellt und per E-Mail versendet."
          );
        } else if (j.mailError) {
          setBannerError(String(j.mailError));
          setBannerSuccess("PDF wurde gespeichert. Der E-Mail-Versand ist fehlgeschlagen.");
        }
      } else {
        setBannerSuccess("PDF wurde erstellt und gespeichert.");
      }
      await load();
    } catch {
      setBannerError("Netzwerkfehler.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <p className="text-slate-600">Laden…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4">
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
  const pdfIframeSrc = pdfHref
    ? `${pdfHref}${pdfHref.includes("?") ? "&" : "?"}t=${pdfCacheBust}`
    : null;
  const emailDisplay = kunde_email?.trim() ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-24">
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

      {bannerError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {bannerError}
        </div>
      ) : null}
      {bannerSuccess ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {bannerSuccess}
        </div>
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
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">
          Schritt 1 – KI-Protokolltext
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Erzeuge einen Entwurf mit KI, bearbeite ihn und gehe danach zur PDF-Erstellung.
        </p>

        {!hasKiText ? (
          <div className="mt-6">
            <Button
              type="button"
              className="min-h-12 w-full gap-2 text-base sm:w-auto"
              disabled={busy !== null}
              onClick={() => void postPreview()}
            >
              {busy === "preview" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
              {busy === "preview" ? "Text wird erstellt…" : "Text generieren"}
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <label htmlFor="ki-text" className="sr-only">
              KI-Protokolltext
            </label>
            <textarea
              id="ki-text"
              value={kiTextDraft}
              onChange={(e) => setKiTextDraft(e.target.value)}
              rows={16}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-base leading-relaxed text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Protokolltext…"
            />
            <div>
              <label
                htmlFor="ki-feedback"
                className="text-sm text-slate-600"
              >
                Feedback / Änderungswunsch
              </label>
              <textarea
                id="ki-feedback"
                value={feedbackDraft}
                onChange={(e) => setFeedbackDraft(e.target.value)}
                rows={3}
                placeholder="Was soll geändert werden? z.B. 'Bitte kürzer fassen' oder 'Ölwechsel erwähnen'"
                className="mt-1.5 w-full resize-y rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 gap-2 text-base"
                disabled={
                  busy !== null ||
                  (feedbackDraft.trim() !== "" && !kiTextDraft.trim())
                }
                onClick={() => void postPreviewRegenerate()}
              >
                {busy === "preview" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCw className="h-5 w-5" />
                )}
                {busy === "preview" ? "Wird erstellt…" : "Text neu generieren"}
              </Button>
              <Button
                type="button"
                className="min-h-12 gap-2 text-base"
                disabled={busy !== null}
                onClick={() => setStepPdf(true)}
              >
                Weiter zu PDF
              </Button>
            </div>
          </div>
        )}
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

      {stepPdf ? (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">
            Schritt 2 – PDF
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Erstelle das PDF aus dem aktuellen Text. Versand per E-Mail ist optional.
          </p>

          <div className="mt-6 space-y-4">
            {!pdfHref ? (
              <Button
                type="button"
                className="min-h-12 w-full gap-2 text-base sm:w-auto"
                disabled={busy !== null || !hasKiText}
                onClick={() => void postGenerate(false)}
              >
                {busy === "pdf" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileDown className="h-5 w-5" />
                )}
                {busy === "pdf" ? "PDF wird erstellt…" : "PDF erstellen"}
              </Button>
            ) : null}

            {pdfIframeSrc ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-inner">
                  <iframe
                    title="PDF-Vorschau"
                    src={pdfIframeSrc}
                    className="h-[min(70vh,720px)] w-full min-h-[320px]"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 gap-2 text-base"
                    disabled={busy !== null || !hasKiText}
                    onClick={() => void postGenerate(false)}
                  >
                    {busy === "pdf" ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-5 w-5" />
                    )}
                    PDF neu erstellen
                  </Button>
                  <Button
                    type="button"
                    className="min-h-12 gap-2 text-base"
                    disabled={
                      busy !== null || !hasKiText || !emailDisplay
                    }
                    onClick={() => void postGenerate(true)}
                    title={
                      !emailDisplay
                        ? "Keine E-Mail beim Kunden hinterlegt"
                        : undefined
                    }
                  >
                    {busy === "mail" ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                    {busy === "mail"
                      ? "Wird gesendet…"
                      : emailDisplay
                        ? `PDF senden an ${emailDisplay}`
                        : "PDF senden (keine E-Mail)"}
                  </Button>
                  <a
                    href={pdfHref}
                    download
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-800 hover:bg-slate-50"
                  >
                    <FileDown className="h-5 w-5 shrink-0" />
                    Nur herunterladen
                  </a>
                </div>
                <p className="text-xs text-slate-500">
                  „PDF senden“ erstellt das PDF erneut mit dem aktuellen Text und
                  versendet es. „Nur herunterladen“ löst keinen Versand aus.
                </p>
              </div>
            ) : null}

            {!pdfHref && !hasKiText ? (
              <p className="text-sm text-amber-800">
                Bitte zuerst in Schritt 1 einen Protokolltext erzeugen oder einfügen.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {protokoll.gesendet_am ? (
        <p className="text-center text-xs text-slate-500">
          Zuletzt gesendet: {formatDate(protokoll.gesendet_am)}
        </p>
      ) : null}
    </div>
  );
}
