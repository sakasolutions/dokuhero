"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Archive,
  ArrowLeft,
  FileDown,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { protokollStatusLabel } from "@/lib/protokoll-status-label";
import type { FotoEintrag, Protokoll } from "@/types";

type ProtokollMitMaterialien = Protokoll & { materialien?: string | null };

type ApiResponse = {
  protokoll: ProtokollMitMaterialien;
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

type Busy = null | "preview" | "pdf" | "mail" | "reject" | "archiv" | "submit";

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
  const router = useRouter();
  const { data: session } = useSession();
  const id = String(params.id);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kiTextDraft, setKiTextDraft] = useState("");
  /** Text im „Neu generieren“-Panel (Quick-Chips + Freitext). */
  const [regenerateFeedback, setRegenerateFeedback] = useState("");
  const [regeneratePanelOpen, setRegeneratePanelOpen] = useState(false);
  const [unterschriftDataUri, setUnterschriftDataUri] = useState<string | null>(
    null
  );
  const [showUnterschrift, setShowUnterschrift] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const unterschriftSectionRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasInkRef = useRef(false);
  const [stepPdf, setStepPdf] = useState(false);
  const [pdfCacheBust, setPdfCacheBust] = useState(0);

  const [busy, setBusy] = useState<Busy>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);
  const [versandErfolg, setVersandErfolg] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editNotiz, setEditNotiz] = useState("");
  const [editMaterialien, setEditMaterialien] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFieldError, setEditFieldError] = useState<string | null>(null);

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

  async function saveEdit() {
    setEditFieldError(null);
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/protokoll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_notiz",
          notiz: editNotiz,
          materialien: editMaterialien,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setEditFieldError(
          typeof j.error === "string" ? j.error : "Speichern fehlgeschlagen."
        );
        return;
      }
      await load();
      setEditMode(false);
    } catch {
      setEditFieldError("Netzwerkfehler.");
    } finally {
      setSavingEdit(false);
    }
  }

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
    setVersandErfolg(false);
  }, [id]);

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

  async function postArchivieren() {
    setBannerError(null);
    setBannerSuccess(null);
    setBusy("archiv");
    try {
      const res = await fetch(`/api/protokoll/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivieren: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBannerError(
          typeof j.error === "string"
            ? j.error
            : "Archivieren fehlgeschlagen."
        );
        return;
      }
      setBannerSuccess("Protokoll wurde archiviert.");
      await load();
      router.refresh();
    } catch {
      setBannerError("Netzwerkfehler.");
    } finally {
      setBusy(null);
    }
  }

  async function postSubmitReview() {
    if (busy !== null) return;
    setBannerError(null);
    setBannerSuccess(null);
    setBusy("submit");
    try {
      const res = await fetch(`/api/protokoll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_review" }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setBannerError(
          typeof j.error === "string"
            ? j.error
            : "Einreichen zur Freigabe fehlgeschlagen."
        );
        return;
      }
      setBannerSuccess("Protokoll wurde zur Freigabe eingereicht.");
      await load();
    } catch {
      setBannerError("Netzwerkfehler.");
    } finally {
      setBusy(null);
    }
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
            : "Zurückschicken fehlgeschlagen."
        );
        return;
      }
      setBannerSuccess("Protokoll wurde zur Überarbeitung zurückgeschickt.");
      await load();
    } catch {
      setBannerError("Netzwerkfehler.");
    } finally {
      setBusy(null);
    }
  }

  function initUnterschriftCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    let w = Math.round(rect.width);
    let h = Math.round(rect.height);
    if (w < 48) w = Math.max(280, canvas.clientWidth || 320);
    if (h < 48) {
      h = window.matchMedia("(min-width: 640px)").matches ? 200 : 220;
    }
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    hasInkRef.current = false;
    setUnterschriftDataUri(null);
  }

  useEffect(() => {
    if (!showUnterschrift) return;
    const id = window.setTimeout(() => {
      initUnterschriftCanvas();
    }, 80);
    return () => window.clearTimeout(id);
  }, [showUnterschrift]);

  useEffect(() => {
    if (!showUnterschrift) return;
    const el = canvasRef.current;
    if (!el) return;
    const opts: AddEventListenerOptions = { passive: false };
    const blockScroll = (e: TouchEvent) => {
      e.preventDefault();
    };
    el.addEventListener("touchstart", blockScroll, opts);
    el.addEventListener("touchmove", blockScroll, opts);
    return () => {
      el.removeEventListener("touchstart", blockScroll);
      el.removeEventListener("touchmove", blockScroll);
    };
  }, [showUnterschrift]);

  function getCanvasPoint(
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const lw = canvas.width / dpr;
    const lh = canvas.height / dpr;
    const x = ((clientX - rect.left) / rect.width) * lw;
    const y = ((clientY - rect.top) / rect.height) * lh;
    return { x, y };
  }

  function drawSegment(
    from: { x: number; y: number },
    to: { x: number; y: number }
  ) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    hasInkRef.current = true;
  }

  function clearUnterschriftCanvas() {
    initUnterschriftCanvas();
  }

  async function confirmUnterschriftAndSend() {
    if (busy !== null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasInkRef.current) {
      setBannerError("Bitte unterschreiben Sie im Feld.");
      return;
    }
    setBannerError(null);
    const dataUri = canvas.toDataURL("image/png");
    setUnterschriftDataUri(dataUri);
    await postGenerate(true, dataUri);
  }

  async function postGenerate(
    sendMail: boolean,
    unterschriftExplicit: string | null | undefined = undefined
  ) {
    if (busy !== null) return;
    const unterschrift =
      unterschriftExplicit !== undefined
        ? unterschriftExplicit
        : unterschriftDataUri;
    setBannerError(null);
    setBannerSuccess(null);
    setBusy(sendMail ? "mail" : "pdf");
    try {
      const res = await fetch(`/api/protokoll/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kiText: kiTextDraft,
          sendMail,
          unterschrift,
        }),
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
      if (sendMail && j.emailSent) {
        setShowUnterschrift(false);
        setVersandErfolg(true);
      } else {
        if (sendMail && unterschrift) {
          setShowUnterschrift(false);
        }
        if (sendMail) {
          if (j.mailError) {
            setBannerError(String(j.mailError));
            setBannerSuccess(
              "PDF wurde gespeichert. Der E-Mail-Versand ist fehlgeschlagen."
            );
          } else if (!j.emailSent) {
            setBannerError("E-Mail konnte nicht versendet werden.");
          }
        } else {
          setBannerSuccess("PDF wurde erstellt und gespeichert.");
        }
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
      <div className="mx-auto max-w-3xl overflow-visible pb-24">
        <p className="text-slate-600">Laden…</p>
      </div>
    );
  }

  const zurueckListeHref =
    session?.user?.rolle === "mitarbeiter" ? "/protokolle" : "/auftraege";

  if (versandErfolg) {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-1 pb-24 pt-4 sm:px-0">
        <Card className="border-green-200 bg-green-50/90 p-8 text-center shadow-md sm:p-10">
          <p className="text-2xl font-bold text-green-900" role="status">
            ✅ Protokoll wurde versendet!
          </p>
          <p className="mt-4 text-base leading-relaxed text-green-800">
            Der Kunde erhält das PDF per E-Mail.
          </p>
          <Button
            type="button"
            className="mt-8 min-h-12 w-full text-base sm:w-auto"
            onClick={() => router.push(zurueckListeHref)}
          >
            {session?.user?.rolle === "mitarbeiter"
              ? "Zurück zu Meine Protokolle"
              : "Zurück zu Aufträge"}
          </Button>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 overflow-visible pb-24">
        <p className="text-red-600">{error ?? "Unbekannter Fehler"}</p>
        <Link
          href={zurueckListeHref}
          className="text-primary hover:text-primary/80 hover:underline"
        >
          {session?.user?.rolle === "mitarbeiter"
            ? "Zurück zu Meine Protokolle"
            : "Zurück zu Aufträgen"}
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
  const isInhaber = session?.user?.rolle === "inhaber";
  const pdfHref = protokoll.pdf_pfad ?? undefined;
  const pdfIframeSrc = pdfHref
    ? `${pdfHref}${pdfHref.includes("?") ? "&" : "?"}t=${pdfCacheBust}`
    : null;
  const emailDisplay = kunde_email?.trim() ?? "";

  const pStatus = protokoll.status;
  const isArchiviert = Number(protokoll.archiviert) === 1;
  const isFreigegeben = pStatus === "freigegeben";
  const isZurPruefung = pStatus === "zur_pruefung";
  const isEntwurf = pStatus === "entwurf";
  const kiReadonly = isFreigegeben || isArchiviert;
  const showChefFreigabeCard = isZurPruefung && chef && !isArchiviert;
  const showChefFreigabeBar =
    showChefFreigabeCard && !!protokoll.pdf_pfad;
  const showWerkerUnterschriftFlow =
    !chef &&
    (isEntwurf || isZurPruefung) &&
    hasKiText &&
    !isArchiviert &&
    !kiReadonly;
  const showProtokollArchivieren =
    isFreigegeben && !isArchiviert;
  const hideSendInStep2 = showChefFreigabeBar;
  const showWeiterZuPdf = isZurPruefung && chef;

  return (
    <div className="mx-auto max-w-3xl space-y-6 overflow-visible pb-24">
      <Link
        href={zurueckListeHref}
        className="inline-flex min-h-12 items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 hover:underline"
      >
        <ArrowLeft className="h-5 w-5" />
        {session?.user?.rolle === "mitarbeiter"
          ? "Zurück zu Meine Protokolle"
          : "Zurück zu Aufträgen"}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Protokoll
          {protokoll.protokoll_nummer != null &&
          Number.isFinite(Number(protokoll.protokoll_nummer))
            ? ` #${protokoll.protokoll_nummer}`
            : null}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
          <span>
            {formatDate(protokoll.erstellt_am)}
            {kunde_name ? ` · ${kunde_name}` : null}
          </span>
          {isFreigegeben ? (
            <>
              <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                Abgeschlossen
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

      {isArchiviert ? (
        <div
          className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-800"
          role="status"
        >
          Dieses Protokoll ist <strong>archiviert</strong> und nur noch
          einsehbar.
        </div>
      ) : null}

      <Card className="overflow-visible">
        <div className="space-y-4 overflow-visible">
          {(pStatus === "entwurf" || pStatus === "zur_pruefung") &&
          !protokoll.archiviert &&
          !editMode ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-8 px-3 py-1 text-xs"
                onClick={() => {
                  setEditFieldError(null);
                  setEditNotiz(protokoll.notiz ?? "");
                  setEditMaterialien(protokoll.materialien ?? "");
                  setEditMode(true);
                }}
              >
                Bearbeiten
              </Button>
            </div>
          ) : null}
          <div>
            <h2 className="text-sm font-semibold text-slate-500">
              Auftragsbeschreibung
            </h2>
            <p className="mt-1 break-words text-slate-800">
              {auftrag_beschreibung ?? "–"}
            </p>
          </div>
          {editMode ? (
            <>
              <div>
                <label
                  htmlFor="edit-notiz"
                  className="block text-sm font-semibold text-slate-500"
                >
                  Notiz
                </label>
                <textarea
                  id="edit-notiz"
                  value={editNotiz}
                  onChange={(e) => setEditNotiz(e.target.value)}
                  rows={4}
                  className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-materialien"
                  className="block text-sm font-semibold text-slate-500"
                >
                  Materialien / Positionen
                </label>
                <textarea
                  id="edit-materialien"
                  value={editMaterialien}
                  onChange={(e) => setEditMaterialien(e.target.value)}
                  rows={2}
                  placeholder="Materialien, Ersatzteile, Positionen..."
                  className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {editFieldError ? (
                <p className="text-sm text-red-600" role="alert">
                  {editFieldError}
                </p>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 text-sm"
                  disabled={savingEdit}
                  onClick={() => {
                    setEditFieldError(null);
                    setEditMode(false);
                  }}
                >
                  Abbrechen
                </Button>
                <Button
                  type="button"
                  className="min-h-10 gap-2 text-sm"
                  disabled={savingEdit}
                  onClick={() => void saveEdit()}
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Wird gespeichert…
                    </>
                  ) : (
                    "Speichern"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-semibold text-slate-500">Notiz</h2>
                <p className="mt-1 whitespace-pre-wrap break-words text-slate-800">
                  {protokoll.notiz?.trim() ? protokoll.notiz : "–"}
                </p>
              </div>
              {protokoll.materialien?.trim() ? (
                <div>
                  <h2 className="text-sm font-semibold text-slate-500">
                    Materialien / Positionen
                  </h2>
                  <p className="mt-1 whitespace-pre-wrap break-words text-slate-800">
                    {protokoll.materialien}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </Card>

      {fotos.length > 0 ? (
        <div className="overflow-visible">
          <h2 className="mb-2 text-sm font-semibold text-slate-500">Fotos</h2>
          <div className="grid grid-cols-2 gap-2 overflow-visible sm:grid-cols-3">
            {fotos.map((f) => (
              <a
                key={f.id}
                href={f.datei_pfad}
                target="_blank"
                rel="noreferrer"
                className="aspect-square rounded-lg bg-slate-100 ring-1 ring-slate-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.datei_pfad}
                  alt={f.dateiname}
                  className="h-full w-full rounded-lg object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">
          Schritt 1 – KI-Protokolltext
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {kiReadonly
            ? "Dieses Protokoll ist freigegeben – der Text kann nicht mehr geändert werden."
            : chef
              ? "Erzeuge mit KI einen Text, bearbeite ihn und gehe zur PDF-Erstellung bzw. Freigabe."
              : "Erzeuge mit KI einen Text, bearbeite ihn, dann Unterschrift des Kunden und Versand per E-Mail."}
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
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full gap-2 text-base sm:w-auto"
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
                  className="min-h-12 w-full gap-2 text-base sm:w-auto"
                  disabled={busy !== null}
                  onClick={() => setStepPdf(true)}
                >
                  Weiter zu PDF
                </Button>
              ) : null}
              {isInhaber &&
              chef &&
              isEntwurf &&
              hasKiText &&
              !isArchiviert ? (
                <Button
                  type="button"
                  className="min-h-12 w-full gap-2 text-base sm:w-auto"
                  disabled={busy !== null}
                  onClick={() => void postSubmitReview()}
                >
                  {busy === "submit" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Wird eingereicht…
                    </>
                  ) : (
                    "Zur Freigabe einreichen"
                  )}
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

      {showWerkerUnterschriftFlow ? (
        <Button
          type="button"
          className="min-h-12 w-full gap-2 bg-green-600 text-base text-white hover:bg-green-700 focus-visible:ring-green-600 sm:w-auto"
          disabled={busy !== null}
          onClick={() => {
            setShowUnterschrift(true);
            requestAnimationFrame(() => {
              unterschriftSectionRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            });
          }}
        >
          Weiter zur Unterschrift & Versand
        </Button>
      ) : null}

      {showUnterschrift ? (
        <div ref={unterschriftSectionRef}>
          <Card className="border-slate-200 shadow-md">
            <h2 className="text-lg font-semibold text-slate-900">
              Unterschrift Kunde
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-700">
              Bitte Kunden unterschreiben lassen.
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Hier mit dem Finger oder der Maus unterschreiben.
            </p>
            <canvas
              ref={canvasRef}
              className="mt-4 h-[220px] w-full touch-none rounded-lg border border-[#e2e8f0] bg-white sm:h-[200px]"
              style={{ touchAction: "none" }}
              onMouseDown={(e) => {
                const p = getCanvasPoint(e.clientX, e.clientY);
                if (!p) return;
                drawingRef.current = true;
                lastPointRef.current = p;
              }}
              onMouseMove={(e) => {
                if (!drawingRef.current || !lastPointRef.current) return;
                const p = getCanvasPoint(e.clientX, e.clientY);
                if (!p) return;
                drawSegment(lastPointRef.current, p);
                lastPointRef.current = p;
              }}
              onMouseUp={() => {
                drawingRef.current = false;
                lastPointRef.current = null;
              }}
              onMouseLeave={() => {
                drawingRef.current = false;
                lastPointRef.current = null;
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                const t = e.touches[0];
                if (!t) return;
                const p = getCanvasPoint(t.clientX, t.clientY);
                if (!p) return;
                drawingRef.current = true;
                lastPointRef.current = p;
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                if (!drawingRef.current || !lastPointRef.current) return;
                const t = e.touches[0];
                if (!t) return;
                const p = getCanvasPoint(t.clientX, t.clientY);
                if (!p) return;
                drawSegment(lastPointRef.current, p);
                lastPointRef.current = p;
              }}
              onTouchEnd={() => {
                drawingRef.current = false;
                lastPointRef.current = null;
              }}
            />
            <div className="mt-4 flex w-full flex-col gap-3 sm:flex-row sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full text-base sm:flex-1"
                disabled={busy !== null}
                onClick={() => clearUnterschriftCanvas()}
              >
                Löschen
              </Button>
              <Button
                type="button"
                className="min-h-12 w-full bg-green-600 text-base text-white hover:bg-green-700 focus-visible:ring-green-600 sm:flex-1"
                disabled={busy !== null || !emailDisplay}
                onClick={() => void confirmUnterschriftAndSend()}
                title={
                  !emailDisplay
                    ? "Keine E-Mail beim Kunden hinterlegt"
                    : undefined
                }
              >
                {busy === "mail" ? (
                  <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" />
                ) : null}
                {busy === "mail"
                  ? "Wird versendet…"
                  : "Unterschrift bestätigen & Senden"}
              </Button>
            </div>
          </Card>
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
                ? "Erstelle die PDF-Vorschau. Der Versand an den Kunden erfolgt über „Freigeben & Senden“ unten."
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
                        ? "Wird versendet…"
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

      {showChefFreigabeCard ? (
        <Card className="border-primary/30 bg-primary/[0.06]">
          <h2 className="text-lg font-semibold text-slate-900">Freigabe</h2>
          <p className="mt-1 text-sm text-slate-600">
            {showChefFreigabeBar
              ? "Wenn Text und PDF-Vorschau passen, kannst du das Protokoll freigeben und an den Kunden senden."
              : "Sobald eine PDF-Vorschau in Schritt 2 existiert, kannst du freigeben und versenden — oder das Protokoll zur Überarbeitung zurückschicken."}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {showChefFreigabeBar ? (
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
                  ? "Wird versendet…"
                  : "Freigeben & Senden"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="min-h-12 gap-2 border-slate-300 text-base text-slate-800"
              disabled={busy !== null}
              onClick={() => void postReject()}
            >
              {busy === "reject" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Wird zurückgeschickt…
                </>
              ) : (
                "Zurückschicken"
              )}
            </Button>
          </div>
        </Card>
      ) : null}

      {showProtokollArchivieren ? (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Archiv</h2>
          <p className="mt-1 text-sm text-slate-600">
            Protokolle werden <strong>10 Jahre</strong> aufbewahrt. Nach dem
            Archivieren bleibt der Eintrag gespeichert und ist unter
            Aufträge → Archiv weiterhin abrufbar.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 min-h-12 gap-2 border-slate-300 text-base"
            disabled={busy !== null}
            onClick={() => void postArchivieren()}
          >
            {busy === "archiv" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Archive className="h-5 w-5" />
            )}
            {busy === "archiv" ? "Wird archiviert…" : "Archivieren"}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
