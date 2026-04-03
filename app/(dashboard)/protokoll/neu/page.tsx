"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Check, CheckCircle2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { FotoUpload } from "@/components/protokoll/FotoUpload";
import { SprachEingabe } from "@/components/protokoll/SprachEingabe";

const STEPS = 5;

type LimitPayload = {
  limitReached: boolean;
  count: number;
  limit: number;
};

type AbschlussModus = "email" | "share" | "intern" | null;

export default function ProtokollNeuPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const isInhaber = session?.user?.rolle === "inhaber";

  const [protokollGestartet, setProtokollGestartet] = useState(false);
  const [step, setStep] = useState(1);
  const prevStepRef = useRef(step);

  const [kundenName, setKundenName] = useState("");
  const [kundenAdresse, setKundenAdresse] = useState("");
  const [kundenTelefon, setKundenTelefon] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [notiz, setNotiz] = useState("");
  const [materialien, setMaterialien] = useState("");

  const [protokollId, setProtokollId] = useState<number | null>(null);
  const [kiText, setKiText] = useState("");
  const [kiLoading, setKiLoading] = useState(false);
  const [kundenEmail, setKundenEmail] = useState<string | null>(null);
  /** Wenn in DB keine E-Mail: hier optional für Kunden-Versand */
  const [kundenEmailExtra, setKundenEmailExtra] = useState("");
  const [emailVersandZiel, setEmailVersandZiel] = useState<string | null>(null);
  const [internBetriebNotified, setInternBetriebNotified] = useState(false);
  const [abschlussWarnung, setAbschlussWarnung] = useState<string | null>(null);

  const [step3Busy, setStep3Busy] = useState(false);
  const [step4Error, setStep4Error] = useState<string | null>(null);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBust, setPdfBust] = useState(0);
  const [step5Error, setStep5Error] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasInkRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const drawingRef = useRef(false);

  const [generateBusy, setGenerateBusy] = useState(false);
  const [abschlussModus, setAbschlussModus] = useState<AbschlussModus>(null);

  const [error, setError] = useState<string | null>(null);
  const [limitPhase, setLimitPhase] = useState<"loading" | "ready">("loading");
  const [limitBlocked, setLimitBlocked] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ count: number; limit: number } | null>(
    null
  );

  const zurueckHref = isInhaber ? "/dashboard" : "/protokolle";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/protokoll/limit");
        const j = (await res.json().catch(() => ({}))) as Partial<LimitPayload> & {
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setLimitPhase("ready");
          setLimitBlocked(false);
          return;
        }
        if (j.limitReached === true && typeof j.limit === "number") {
          setLimitInfo({
            count: typeof j.count === "number" ? j.count : j.limit,
            limit: j.limit,
          });
          setLimitBlocked(true);
        } else {
          setLimitBlocked(false);
        }
      } catch {
        if (!cancelled) setLimitBlocked(false);
      } finally {
        if (!cancelled) setLimitPhase("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function canGoStep2() {
    return kundenName.trim().length > 0;
  }

  function canSubmit() {
    return canGoStep2();
  }

  async function refreshLimitAndBlock() {
    try {
      const res = await fetch("/api/protokoll/limit");
      const j = (await res.json()) as Partial<LimitPayload>;
      if (res.ok && j.limitReached === true && typeof j.limit === "number") {
        setLimitInfo({
          count: typeof j.count === "number" ? j.count : j.limit,
          limit: j.limit,
        });
        setLimitBlocked(true);
      }
    } catch {
      /* ignore */
    }
  }

  /** Kunde + Auftrag + Protokoll; setzt bei Fehler `error`, liefert null. */
  async function saveProtokollCore(): Promise<number | null> {
    setError(null);
    const resKunde = await fetch("/api/kunden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: kundenName.trim(),
        adresse: kundenAdresse.trim() || null,
        telefon: kundenTelefon.trim() || null,
      }),
    });
    const jKunde = (await resKunde.json().catch(() => ({}))) as {
      id?: number;
      error?: unknown;
    };
    if (!resKunde.ok || typeof jKunde.id !== "number") {
      const fe = jKunde.error;
      const msg =
        typeof fe === "object" &&
        fe != null &&
        "name" in fe &&
        Array.isArray((fe as { name?: string[] }).name)
          ? String((fe as { name: string[] }).name[0])
          : typeof fe === "string"
            ? fe
            : "Kunde konnte nicht angelegt werden.";
      setError(msg);
      return null;
    }

    const resAuf = await fetch("/api/auftraege", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kunde_id: jKunde.id }),
    });
    const jAuf = (await resAuf.json().catch(() => ({}))) as {
      id?: number;
      error?: unknown;
    };
    if (!resAuf.ok || typeof jAuf.id !== "number") {
      setError(
        typeof jAuf.error === "string"
          ? jAuf.error
          : "Auftrag konnte nicht erstellt werden."
      );
      return null;
    }

    const res = await fetch("/api/protokoll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auftrag_id: jAuf.id,
        notiz: notiz.trim() || null,
        materialien: materialien.trim() || null,
        fotos,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as {
      protokoll_id?: number;
      error?: string;
      limitReached?: boolean;
    };
    if (!res.ok) {
      if (res.status === 403 && j.limitReached === true) {
        await refreshLimitAndBlock();
      } else {
        setError(
          typeof j.error === "string" ? j.error : "Speichern fehlgeschlagen."
        );
      }
      return null;
    }
    if (typeof j.protokoll_id !== "number") {
      setError("Speichern fehlgeschlagen.");
      return null;
    }
    return j.protokoll_id;
  }

  async function fetchKiPreview(id: number) {
    const res = await fetch(`/api/protokoll/${id}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const j = (await res.json().catch(() => ({}))) as {
      kiText?: string;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(
        typeof j.error === "string" ? j.error : "KI-Text konnte nicht erstellt werden."
      );
    }
    setKiText(j.kiText ?? "");
  }

  async function proceedToStep4() {
    if (!canSubmit()) return;
    setStep4Error(null);
    setError(null);
    setStep3Busy(true);
    try {
      let id = protokollId;
      if (id == null) {
        const newId = await saveProtokollCore();
        if (newId == null) return;
        id = newId;
        setProtokollId(newId);
        const det = await fetch(`/api/protokoll/${newId}`);
        if (det.ok) {
          const dj = (await det.json()) as { kunde_email?: string | null };
          const em = dj.kunde_email?.trim();
          setKundenEmail(em && em.length > 0 ? em : null);
        } else {
          setKundenEmail(null);
        }
      }

      setStep(4);
      setKiLoading(true);
      await fetchKiPreview(id);
    } catch (e) {
      setStep4Error(
        e instanceof Error ? e.message : "KI-Text konnte nicht erstellt werden."
      );
    } finally {
      setKiLoading(false);
      setStep3Busy(false);
    }
  }

  async function retryStep4() {
    if (protokollId == null) {
      await proceedToStep4();
      return;
    }
    setStep4Error(null);
    setKiLoading(true);
    try {
      await fetchKiPreview(protokollId);
    } catch (e) {
      setStep4Error(
        e instanceof Error ? e.message : "KI-Text konnte nicht erstellt werden."
      );
    } finally {
      setKiLoading(false);
    }
  }

  const loadPdfForStep5 = useCallback(async (text: string) => {
    if (protokollId == null) return;
    setStep5Error(null);
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/protokoll/${protokollId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kiText: text, sendMail: false }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        pdfUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          typeof j.error === "string" ? j.error : "PDF konnte nicht erstellt werden."
        );
      }
      if (typeof j.pdfUrl === "string") {
        setPdfUrl(j.pdfUrl);
        setPdfBust(Date.now());
      }
    } catch (e) {
      setStep5Error(
        e instanceof Error ? e.message : "PDF konnte nicht erstellt werden."
      );
    } finally {
      setPdfLoading(false);
    }
  }, [protokollId]);

  useEffect(() => {
    const was = prevStepRef.current;
    prevStepRef.current = step;
    if (step !== 5 || protokollId == null) return;
    if (was !== 4) return;
    void loadPdfForStep5(kiText);
  }, [step, protokollId, kiText, loadPdfForStep5]);

  function initUnterschriftCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    hasInkRef.current = false;
    setHasSignature(false);
  }

  useEffect(() => {
    if (step !== 5 || pdfLoading || abschlussModus != null) return;
    const t = window.setTimeout(() => initUnterschriftCanvas(), 0);
    return () => window.clearTimeout(t);
  }, [step, pdfLoading, pdfUrl, pdfBust, abschlussModus]);

  useEffect(() => {
    if (step !== 5 || pdfLoading || abschlussModus != null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const onMove = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      hasInkRef.current = true;
      setHasSignature(true);
    };

    const onUp = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      drawingRef.current = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, [step, pdfLoading, pdfUrl, pdfBust, abschlussModus]);

  function clearCanvas() {
    initUnterschriftCanvas();
  }

  function getSignatureDataUri(): string | null {
    const c = canvasRef.current;
    if (!c || !hasInkRef.current) return null;
    try {
      return c.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  function effectiveKundenEmail(): string {
    const a = kundenEmail?.trim() ?? "";
    const b = kundenEmailExtra.trim();
    return a || b;
  }

  async function postGenerate(
    sendMail: boolean,
    unterschrift: string | null,
    opts: { kundeEmail?: string; notifyBetriebIntern?: boolean } = {}
  ) {
    if (generateBusy || protokollId == null) return null;
    setError(null);
    setGenerateBusy(true);
    try {
      const body: Record<string, unknown> = {
        kiText,
        sendMail,
        unterschrift,
      };
      if (opts.kundeEmail?.trim()) {
        body.kundeEmail = opts.kundeEmail.trim();
      }
      if (opts.notifyBetriebIntern === true) {
        body.notifyBetriebIntern = true;
      }
      const res = await fetch(`/api/protokoll/${protokollId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        pdfUrl?: string;
        emailSent?: boolean;
        mailError?: string;
        kopieAnBetriebError?: string;
        betriebInternNotified?: boolean;
        betriebInternMailError?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          typeof j.error === "string" ? j.error : "Vorgang fehlgeschlagen."
        );
      }
      if (typeof j.pdfUrl === "string") {
        setPdfUrl(j.pdfUrl);
        setPdfBust(Date.now());
      }
      return j;
    } finally {
      setGenerateBusy(false);
    }
  }

  async function handleEmailSend() {
    const sig = getSignatureDataUri();
    if (!sig) return;
    const to = effectiveKundenEmail();
    if (!to) {
      setError("Bitte eine gültige E-Mail-Adresse des Kunden angeben.");
      return;
    }
    try {
      const j = await postGenerate(true, sig, { kundeEmail: to });
      if (!j) return;
      if (j.mailError) {
        setError(String(j.mailError));
        return;
      }
      if (j.emailSent) {
        setEmailVersandZiel(to);
        setAbschlussWarnung(
          j.kopieAnBetriebError
            ? `Kopie an den Betrieb konnte nicht gesendet werden: ${j.kopieAnBetriebError}`
            : null
        );
        setAbschlussModus("email");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Versand fehlgeschlagen.");
    }
  }

  async function handleIntern() {
    const sig = getSignatureDataUri();
    if (!sig) return;
    try {
      const j = await postGenerate(false, sig, { notifyBetriebIntern: true });
      if (!j) return;
      setAbschlussWarnung(
        j.betriebInternMailError ? String(j.betriebInternMailError) : null
      );
      setInternBetriebNotified(j.betriebInternNotified === true);
      setAbschlussModus("intern");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    }
  }

  const stepLabel =
    step === 1
      ? " · Kundendaten"
      : step === 2
        ? " · Fotos"
        : step === 3
          ? " · Notiz"
          : step === 4
            ? " · KI-Text"
            : " · Unterschrift & Versand";

  if (limitPhase === "loading" || sessionStatus === "loading") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center pb-6">
        <p className="text-slate-600">Laden…</p>
      </div>
    );
  }

  if (limitBlocked && limitInfo) {
    const { limit } = limitInfo;
    return (
      <div className="mx-auto max-w-xl pb-8">
        <Card className="border-amber-200 bg-amber-50/80 p-8 shadow-md sm:p-10">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Monatliches Limit erreicht
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-700 sm:text-lg">
            Ihr Betrieb hat diesen Monat bereits {limit}{" "}
            {limit === 1 ? "Protokoll" : "Protokolle"} erstellt.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-700 sm:text-lg">
            Bitte wenden Sie sich an den Betriebsinhaber für ein Upgrade.
          </p>
          <div className="mt-10">
            <Button
              type="button"
              className="min-h-12 w-full text-base sm:w-auto"
              onClick={() => router.push(zurueckHref)}
            >
              {isInhaber ? "Zurück zum Dashboard" : "Zu meinen Protokollen"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!protokollGestartet) {
    return (
      <div className="mx-auto min-h-[70vh] max-w-lg pb-6">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href={zurueckHref}
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg text-primary hover:bg-surface"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Protokoll</h1>
        </div>
        <button
          type="button"
          onClick={() => setProtokollGestartet(true)}
          className="flex min-h-[min(60vh,28rem)] w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center shadow-sm transition hover:border-primary/50 hover:bg-slate-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus
            className="h-16 w-16 text-primary sm:h-20 sm:w-20"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="text-xl font-bold text-slate-900">
            Neues Protokoll
          </span>
          <span className="text-sm text-slate-500">
            Tippe hier um zu starten
          </span>
        </button>
      </div>
    );
  }

  if (abschlussModus != null) {
    return (
      <div className="mx-auto min-h-[70vh] max-w-lg pb-6">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href={zurueckHref}
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg text-primary hover:bg-surface"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900">Protokoll</h1>
        </div>
        <Card className="border-green-200 bg-green-50/90 p-8 text-center shadow-md sm:p-10">
          <CheckCircle2
            className="mx-auto h-16 w-16 text-green-600"
            strokeWidth={1.75}
            aria-hidden
          />
          <p className="mt-6 text-2xl font-bold text-green-900">
            Protokoll abgeschlossen!
          </p>
          <p className="mt-4 text-base leading-relaxed text-green-800">
            {abschlussModus === "email" && emailVersandZiel
              ? `PDF wurde an ${emailVersandZiel} gesendet (Kunde). Der Betrieb erhält eine Kopie.`
              : abschlussModus === "email"
                ? "PDF wurde per E-Mail gesendet."
                : abschlussModus === "share"
                  ? "Protokoll wurde geteilt."
                  : internBetriebNotified
                    ? "Protokoll wurde gespeichert. Der Betrieb (Chef) wurde per E-Mail mit PDF informiert."
                    : "Protokoll wurde gespeichert."}
          </p>
          {abschlussWarnung ? (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {abschlussWarnung}
            </p>
          ) : null}
          <Button
            type="button"
            className="mt-8 min-h-12 w-full text-base sm:w-auto"
            onClick={() => router.push("/protokolle")}
          >
            Zurück zur Übersicht
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[70vh] max-w-2xl pb-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={zurueckHref}
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg text-primary hover:bg-surface"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Protokoll</h1>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {Array.from({ length: STEPS }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex items-center gap-1.5 sm:gap-2">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition sm:h-11 sm:w-11 sm:text-sm ${
                step === s
                  ? "bg-primary text-white ring-2 ring-primary ring-offset-2"
                  : step > s
                    ? "bg-primary text-white"
                    : "bg-slate-200 text-slate-600"
              }`}
            >
              {step > s ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : s}
            </div>
            {s < STEPS ? (
              <div
                className={`h-0.5 w-4 rounded-full sm:h-1 sm:w-6 ${step > s ? "bg-primary/60" : "bg-slate-200"}`}
              />
            ) : null}
          </div>
        ))}
      </div>
      <p className="mb-6 text-center text-sm font-medium text-slate-600">
        Schritt {step} von {STEPS}
        {stepLabel}
      </p>

      {(error || step4Error || step5Error) ? (
        <div className="mb-4 space-y-3">
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {step4Error ? (
            <div className="rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700">
              <p>{step4Error}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-11 w-full border-red-200 text-red-800"
                onClick={() => void retryStep4()}
              >
                Erneut versuchen
              </Button>
            </div>
          ) : null}
          {step5Error ? (
            <div className="rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700">
              <p>{step5Error}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-11 w-full border-red-200 text-red-800"
                onClick={() => protokollId != null && void loadPdfForStep5(kiText)}
              >
                Erneut versuchen
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <Card className="border-slate-200 shadow-md">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Kundendaten</h2>
            <div className="space-y-2">
              <label
                htmlFor="kunde-name"
                className="block text-sm font-medium text-slate-700"
              >
                Name *
              </label>
              <input
                id="kunde-name"
                type="text"
                autoComplete="organization"
                placeholder="z.B. Müller GmbH oder Max Mustermann"
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={kundenName}
                onChange={(e) => setKundenName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="kunde-adresse"
                className="block text-sm font-medium text-slate-700"
              >
                Adresse
              </label>
              <input
                id="kunde-adresse"
                type="text"
                autoComplete="street-address"
                placeholder="Straße, PLZ Ort"
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={kundenAdresse}
                onChange={(e) => setKundenAdresse(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="kunde-telefon"
                className="block text-sm font-medium text-slate-700"
              >
                Telefon
              </label>
              <input
                id="kunde-telefon"
                type="tel"
                autoComplete="tel"
                placeholder="+49 ..."
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={kundenTelefon}
                onChange={(e) => setKundenTelefon(e.target.value)}
              />
            </div>
            <Button
              type="button"
              className="min-h-12 w-full text-base sm:w-auto"
              disabled={!canGoStep2()}
              onClick={() => setStep(2)}
            >
              Weiter
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Fotos</h2>
            <FotoUpload value={fotos} onChange={setFotos} maxPhotos={10} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full flex-1 text-base sm:w-auto"
                onClick={() => setStep(1)}
              >
                Zurück
              </Button>
              <Button
                type="button"
                className="min-h-12 w-full flex-1 text-base sm:w-auto"
                onClick={() => setStep(3)}
              >
                Weiter
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Notiz</h2>
            <p className="text-sm text-slate-600">
              Tippe oder sprich deine Notiz…
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <Textarea
                  id="protokoll-notiz"
                  label="Beschreibung / Befunde"
                  placeholder="Was wurde gemacht? Befunde, Maßnahmen …"
                  value={notiz}
                  onChange={(e) => setNotiz(e.target.value)}
                  rows={10}
                  className="min-h-[220px] text-base"
                />
              </div>
              <SprachEingabe
                onTranscript={(t) =>
                  setNotiz((n) => {
                    const cur = n.trim();
                    return cur ? `${cur} ${t}` : t;
                  })
                }
              />
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Materialien / Positionen
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <Textarea
                    id="protokoll-materialien"
                    aria-label="Materialien / Positionen"
                    placeholder="Materialien, Ersatzteile, Positionen..."
                    value={materialien}
                    onChange={(e) => setMaterialien(e.target.value)}
                    rows={3}
                    className="min-h-[4.5rem] text-base"
                  />
                </div>
                <SprachEingabe
                  onTranscript={(t) => {
                    setMaterialien((prev) => {
                      const p = prev.trim();
                      return p === "" ? t : `${p}, ${t}`;
                    });
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full flex-1 text-base sm:w-auto"
                onClick={() => setStep(2)}
              >
                Zurück
              </Button>
              <Button
                type="button"
                className="min-h-12 w-full flex-1 text-base sm:w-auto"
                disabled={!canSubmit() || step3Busy}
                onClick={() => void proceedToStep4()}
              >
                {step3Busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gespeichert…
                  </>
                ) : (
                  "Weiter"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">KI-Text</h2>
            {kiLoading ? (
              <div
                className="flex flex-col items-center justify-center gap-3 py-10 text-slate-600"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-center text-base">
                  KI erstellt deinen Protokolltext…
                </p>
              </div>
            ) : (
              <>
                <Textarea
                  id="protokoll-ki"
                  label="Protokolltext"
                  value={kiText}
                  onChange={(e) => setKiText(e.target.value)}
                  rows={6}
                  className="min-h-[8rem] text-base"
                />
                <p className="text-xs text-slate-500">
                  Du kannst den Text anpassen
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 w-full text-base"
                  disabled={kiLoading || protokollId == null}
                  onClick={() =>
                    protokollId != null &&
                    void (async () => {
                      setStep4Error(null);
                      setKiLoading(true);
                      try {
                        await fetchKiPreview(protokollId);
                      } catch (e) {
                        setStep4Error(
                          e instanceof Error
                            ? e.message
                            : "KI-Text konnte nicht erstellt werden."
                        );
                      } finally {
                        setKiLoading(false);
                      }
                    })()
                  }
                >
                  Text neu generieren
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 w-full flex-1 text-base sm:w-auto"
                    onClick={() => setStep(3)}
                  >
                    Zurück
                  </Button>
                  <Button
                    type="button"
                    className="min-h-12 w-full flex-1 text-base sm:w-auto"
                    disabled={!kiText.trim()}
                    onClick={() => setStep(5)}
                  >
                    Weiter zur Vorschau
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Unterschrift &amp; Versand
            </h2>
            {pdfLoading ? (
              <div
                className="flex flex-col items-center justify-center gap-3 py-10 text-slate-600"
                role="status"
              >
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p>PDF wird erstellt…</p>
              </div>
            ) : pdfUrl ? (
              <>
                <iframe
                  title="PDF-Vorschau"
                  src={`${pdfUrl}?t=${pdfBust}`}
                  className="h-[400px] w-full rounded-lg border border-slate-200 bg-slate-100"
                />
                <h3 className="text-base font-semibold text-slate-900">
                  Kunde unterschreiben lassen
                </h3>
                <canvas
                  ref={canvasRef}
                  className="w-full touch-none rounded-lg border border-slate-300 bg-white"
                  style={{ height: 200, touchAction: "none" }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 w-full text-base"
                  onClick={clearCanvas}
                >
                  Löschen
                </Button>
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <Button
                    type="button"
                    className="min-h-12 w-full text-base"
                    disabled={
                      !hasSignature ||
                      generateBusy ||
                      !effectiveKundenEmail()
                    }
                    onClick={() => void handleEmailSend()}
                  >
                    Per E-Mail senden
                  </Button>
                  {!kundenEmail?.trim() ? (
                    <div className="space-y-1">
                      <label
                        htmlFor="kunde-email-extra"
                        className="block text-xs font-medium text-slate-600"
                      >
                        E-Mail-Adresse des Kunden (optional)
                      </label>
                      <input
                        id="kunde-email-extra"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="name@beispiel.de"
                        className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={kundenEmailExtra}
                        onChange={(e) => setKundenEmailExtra(e.target.value)}
                      />
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 w-full border-slate-300 text-base text-slate-700"
                    disabled={!hasSignature || generateBusy}
                    onClick={() => void handleIntern()}
                  >
                    Intern speichern
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-12 w-full text-base text-slate-600"
                  onClick={() => setStep(4)}
                >
                  Zurück
                </Button>
              </>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
