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
import type { FotoEintrag, Protokoll, ProtokollStatus } from "@/types";

type ApiResponse = {
  protokoll: Protokoll;
  kunde_name: string | null;
  kunde_email: string | null;
  auftrag_beschreibung: string | null;
  fotos: FotoEintrag[];
  freigabe_erlaubt: boolean;
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

type Busy = null | "preview" | "pdf" | "mail" | "reject" | "submit";

function protokollStatusLabel(s: ProtokollStatus | string): string {
  switch (s) {
    case "entwurf":
      return "Entwurf";
    case "zur_pruefung":
      return "Zur Prüfung";
    case "freigegeben":
      return "Freigegeben";
    default:
      return String(s);
  }
}

const REGENERATE_PRESETS: { label: string; text: string }[] = [
  { label: "Kürzer", text: "Bitte kürzer fassen" },
  { label: "Formeller", text: "Bitte formeller formulieren" },
  {
    label: "Einfacher",
    text: "Bitte einfacher und verständlicher schreiben",
  },
];

export default function ProtokollAnsichtPage() {
  const params = useParams();
  const id = String(params.id);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kiTextDraft, setKiTextDraft] = useState("");
  /** Text im „Neu generieren“-Panel (Quick-Chips + Freitext). */
  const [regenerateFeedback, setRegenerateFeedback] = useState("");
  const [regeneratePanelOpen, setRegeneratePanelOpen] = useState(false);
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
    const st = data.protokoll.status;
    const chef = data.freigabe_erlaubt;
    if (st === "freigegeben") {
      setStepPdf(true);
    } else if (st === "zur_pruefung") {
      setStepPdf(chef && !!data.protokoll.pdf_pfad);
    } else {
      setStepPdf(false);
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

  /** Aus dem Panel: mit oder ohne Feedback (leer = komplett aus Notiz neu). */
  async function postPreviewRegenerateFromPanel() {
    setBannerError(null);
    setBannerSuccess(null);
    setBusy("preview");
    try {
      const fb = regenerateFeedback.trim();
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
        setRegenerateFeedback("");
        setRegeneratePanelOpen(false);
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

  function openRegeneratePanel() {
    setRegenerateFeedback("");
    setRegeneratePanelOpen(true);
    setBannerError(null);
  }

  function closeRegeneratePanel() {
    setRegeneratePanelOpen(false);
    setRegenerateFeedback("");
  }

  async function postReject() {
    setBannerError(null);
    setBannerSuccess(null);
    setBusy("reject");
    try {
      const res = await fetch(`/api/protokoll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBannerError(
          typeof j.error === "string"
            ? j.error
            : "Zurückweisen fehlgeschlagen."
        );
        return;
      }
      setBannerSuccess("Protokoll wurde abgelehnt und ist wieder ein Entwurf.");
      await load();
    } catch {
      setBannerError("Netzwerkfehler.");
    } finally {
      setBusy(null);
    }
  }

  async function postSubmitReview() {
    setBannerError(null);
    setBannerSuccess(null);
    setBusy("submit");
    try {
      const res = await fetch(`/api/protokoll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_review" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBannerError(
          typeof j.error === "string"
            ? j.error
            : "Einreichen fehlgeschlagen."
        );
        return;
      }
      setBannerSuccess("Protokoll wurde erneut zur Prüfung eingereicht.");
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
      <div className="mx-auto max-w-3xl">
        <p className="text-slate-600">Laden…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-red-600">{error ?? "Unbekannter Fehler"}</p>
        <Link href="/auftraege" className="text-primary hover:text-primary/80 hover:underline">
          Zurück zu Aufträgen
        </Link>
      </div>
    );
  }

  const {
    protokoll,
    kunde_name,
    kunde_email,
    auftrag_beschreibung,
    fotos,
    freigabe_erlaubt: freigabeRaw,
  } = data;
  const chef = freigabeRaw === true;
  const pdfHref = protokoll.pdf_pfad ?? undefined;
  const pdfIframeSrc = pdfHref
    ? `${pdfHref}${pdfHref.includes("?") ? "&" : "?"}t=${pdfCacheBust}`
    : null;
  const emailDisplay = kunde_email?.trim() ?? "";

  const pStatus = protokoll.status;
  const isFreigegeben = pStatus === "freigegeben";
  const isZurPruefung = pStatus === "zur_pruefung";
  const isEntwurf = pStatus === "entwurf";
  const kiReadonly = isFreigegeben;
  const showChefFreigabeBar = isZurPruefung && chef;
  const showWorkerWarten = isZurPruefung && !chef;
  const hideSendInStep2 = showChefFreigabeBar;
  const showWeiterZuPdf = isZurPruefung && chef;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/auftraege"
        className="inline-flex min-h-12 items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 hover:underline"
      >
        <ArrowLeft className="h-5 w-5" />
        Zurück zu Aufträgen
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Protokoll</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
          <span>
            {formatDate(protokoll.erstellt_am)}
            {kunde_name ? ` · ${kunde_name}` : null}
          </span>
          {isFreigegeben ? (
            <>
              <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                Freigegeben
              </span>
              {protokoll.gesendet_am ? (
                <span className="text-sm text-slate-500">
                  Gesendet: {formatDate(protokoll.gesendet_am)}
                </span>
              ) : null}
            </>
          ) : (
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {protokollStatusLabel(pStatus)}
            </span>
          )}
        </p>
      </div>

      {bannerError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {bannerError}
        </div>
      ) : null}
      {bannerSuccess ? (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {bannerSuccess}
        </div>
      ) : null}

      {showWorkerWarten ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          Dieses Protokoll wartet auf die Freigabe durch einen
          berechtigten Nutzer (Chef / Administrator).
        </div>
      ) : null}

      {showChefFreigabeBar ? (
        <Card className="border-primary/30 bg-primary/[0.06]">
          <h2 className="text-lg font-semibold text-slate-900">Freigabe</h2>
          <p className="mt-1 text-sm text-slate-600">
            Prüfe den Protokolltext und die PDF-Vorschau (Schritt 2). Wenn alles
            passt: freigeben und an den Kunden senden.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              className="min-h-12 gap-2 text-base shadow-sm"
              disabled={
                busy !== null ||
                !hasKiText ||
                !emailDisplay
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
                : "Freigeben & Senden"}
            </Button>
            <Button
              type="button"
              variant="danger"
              className="min-h-12 text-base"
              disabled={busy !== null}
              onClick={() => void postReject()}
            >
              {busy === "reject" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : null}
              Ablehnen
            </Button>
          </div>
        </Card>
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
          {kiReadonly
            ? "Dieses Protokoll ist freigegeben – der Text kann nicht mehr geändert werden."
            : "Erzeuge einen Entwurf mit KI, bearbeite ihn und reiche ihn zur Prüfung ein bzw. gehe als Freigeber zur PDF-Erstellung."}
        </p>

        {!hasKiText && !kiReadonly ? (
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
        ) : hasKiText ? (
          <div className="mt-6 space-y-4">
            <label htmlFor="ki-text" className="sr-only">
              KI-Protokolltext
            </label>
            <textarea
              id="ki-text"
              value={kiTextDraft}
              onChange={(e) => setKiTextDraft(e.target.value)}
              readOnly={kiReadonly}
              rows={16}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-base leading-relaxed text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 read-only:bg-slate-50 read-only:text-slate-800"
              placeholder="Protokolltext…"
            />
            {!kiReadonly ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 gap-2 text-base"
                disabled={busy !== null || regeneratePanelOpen}
                onClick={openRegeneratePanel}
                title={
                  regeneratePanelOpen
                    ? "Schließe das Panel über „Abbrechen“ oder starte die Generierung."
                    : undefined
                }
              >
                <RefreshCw className="h-5 w-5" />
                Text neu generieren
              </Button>
              {showWeiterZuPdf ? (
                <Button
                  type="button"
                  className="min-h-12 gap-2 text-base"
                  disabled={busy !== null}
                  onClick={() => setStepPdf(true)}
                >
                  Weiter zu PDF
                </Button>
              ) : null}
            </div>
            ) : null}

            {!kiReadonly && regeneratePanelOpen ? (
              <div className="rounded-lg border border-slate-200 bg-slate-100/90 px-4 py-4 text-slate-800 shadow-sm">
                <p className="text-sm font-medium text-slate-700">
                  Was soll geändert werden?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {REGENERATE_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      disabled={busy !== null}
                      onClick={() => setRegenerateFeedback(p.text)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <label htmlFor="regenerate-feedback" className="sr-only">
                  Eigener Änderungswunsch
                </label>
                <textarea
                  id="regenerate-feedback"
                  value={regenerateFeedback}
                  onChange={(e) => setRegenerateFeedback(e.target.value)}
                  rows={3}
                  disabled={busy !== null}
                  placeholder='Oder eigenen Wunsch eingeben, z.B. "Ölwechsel erwähnen"'
                  className="mt-3 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300 disabled:opacity-50"
                />
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 text-sm"
                    disabled={busy !== null}
                    onClick={closeRegeneratePanel}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="button"
                    className="min-h-11 gap-2 text-sm"
                    disabled={
                      busy !== null ||
                      (regenerateFeedback.trim() !== "" &&
                        !kiTextDraft.trim())
                    }
                    onClick={() => void postPreviewRegenerateFromPanel()}
                  >
                    {busy === "preview" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Wird generiert…
                      </>
                    ) : (
                      <>
                        Neu generieren
                        <span aria-hidden> →</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      {isEntwurf && hasKiText ? (
        <Card>
          <p className="text-sm text-slate-600">
            Wenn der Protokolltext fertig ist, reiche ihn wieder zur Prüfung ein.
          </p>
          <Button
            type="button"
            className="mt-4 min-h-12 gap-2 text-base"
            disabled={busy !== null}
            onClick={() => void postSubmitReview()}
          >
            {busy === "submit" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            {busy === "submit"
              ? "Wird eingereicht…"
              : "Erneut zur Prüfung einreichen"}
          </Button>
        </Card>
      ) : null}

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
            {isFreigegeben
              ? "Freigegebenes Protokoll – Vorschau und Download."
              : hideSendInStep2
                ? "Erstelle die PDF-Vorschau. Der Versand an den Kunden erfolgt über „Freigeben & Senden“ oben."
                : "Erstelle das PDF aus dem aktuellen Text. Versand per E-Mail ist optional."}
          </p>

          <div className="mt-6 space-y-4">
            {!pdfHref && !isFreigegeben ? (
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
                  {!isFreigegeben ? (
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
                  ) : null}
                  {!isFreigegeben && !hideSendInStep2 ? (
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
                  ) : null}
                  {pdfHref ? (
                    <a
                      href={pdfHref}
                      download
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-800 hover:bg-slate-50"
                    >
                      <FileDown className="h-5 w-5 shrink-0" />
                      Nur herunterladen
                    </a>
                  ) : null}
                </div>
                {!isFreigegeben && !hideSendInStep2 ? (
                  <p className="text-xs text-slate-500">
                    „PDF senden“ erstellt das PDF erneut mit dem aktuellen Text
                    und versendet es. „Nur herunterladen“ löst keinen Versand
                    aus.
                  </p>
                ) : null}
              </div>
            ) : null}

            {!pdfHref && !hasKiText && !isFreigegeben ? (
              <p className="text-sm text-primary">
                Bitte zuerst in Schritt 1 einen Protokolltext erzeugen oder
                einfügen.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
