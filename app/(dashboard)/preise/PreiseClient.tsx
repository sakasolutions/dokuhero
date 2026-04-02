"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

type Billing = "monthly" | "yearly";

type Props = {
  currentPlan: string;
  trialDaysLeft: number | null;
};

export function PreiseClient({ currentPlan, trialDaysLeft }: Props) {
  const router = useRouter();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [busy, setBusy] = useState<null | "starter" | "pro">(null);
  const [error, setError] = useState<string | null>(null);

  const planLabel = useMemo(() => {
    const p = currentPlan?.trim()?.toLowerCase();
    if (p === "pro") return "Pro";
    if (p === "starter") return "Starter";
    if (p === "trial") return "Trial";
    if (p === "expired") return "Abgelaufen";
    return currentPlan || "–";
  }, [currentPlan]);

  async function startCheckout(plan: "starter" | "pro") {
    setError(null);
    setBusy(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing }),
      });
      const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Checkout fehlgeschlagen.");
        return;
      }
      if (!j.url) {
        setError("Checkout-URL fehlt.");
        return;
      }
      window.location.href = j.url;
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">Dein aktueller Plan</p>
        <p className="mt-1 text-xl font-bold text-slate-900">{planLabel}</p>
        {currentPlan?.toLowerCase() === "trial" && trialDaysLeft != null ? (
          <p className="mt-2 text-sm text-slate-600">
            Noch <span className="font-semibold text-slate-900">{trialDaysLeft}</span>{" "}
            Tage Trial
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex min-h-[48px] w-full rounded-xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold transition sm:min-h-12 sm:px-4 ${
              billing === "monthly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Monatlich
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`min-h-11 flex-1 rounded-lg px-2 text-xs font-semibold leading-tight transition sm:min-h-12 sm:px-3 sm:text-sm ${
              billing === "yearly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="block sm:inline">Jährlich</span>
            <span className="block text-[0.7rem] font-medium text-slate-500 sm:ml-1 sm:inline sm:text-sm">
              — 2 Monate gratis
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Aktualisieren
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 pb-10 shadow-sm sm:p-8 sm:pb-12">
          <h3 className="text-xl font-bold text-slate-900">Starter</h3>
          <p className="mt-4 text-4xl font-extrabold tracking-tight text-primary">
            29€
            <span className="ml-2 text-sm font-semibold text-slate-500">/Monat netto</span>
          </p>
          <p className="mt-2 text-sm text-slate-500">
            <span className="line-through">Normalpreis: 39€</span>
          </p>
          <ul className="mt-6 flex min-h-0 flex-1 flex-col gap-3 text-sm text-slate-700">
            {[
              "Bis 50 Protokolle/Monat",
              "KI-Protokolltext",
              "PDF-Generierung",
              "Automatischer Mail-Versand",
              "Bewertungs-Automatik",
              "1 Benutzer",
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={2.5} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
            disabled={busy != null}
            onClick={() => void startCheckout("starter")}
          >
            {busy === "starter" ? "Weiterleiten…" : "30 Tage kostenlos starten"}
          </button>
        </div>

        <div className="relative flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
          <span className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
            Beliebt
          </span>
          <h3 className="text-xl font-bold text-white">Pro</h3>
          <p className="mt-4 text-4xl font-extrabold tracking-tight text-white">
            59€
            <span className="ml-2 text-sm font-semibold text-slate-400">/Monat netto</span>
          </p>
          <p className="mt-2 text-sm text-slate-500">
            <span className="line-through">Normalpreis: 79€</span>
          </p>
          <ul className="mt-6 flex min-h-0 flex-1 flex-col gap-3 text-sm text-slate-200">
            {[
              "Unbegrenzte Protokolle",
              "Alles aus Starter",
              "Priority Support",
              "Early Access zu neuen Features",
              "Team-Zugang (coming soon)",
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={2.5} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
            disabled={busy != null}
            onClick={() => void startCheckout("pro")}
          >
            {busy === "pro" ? "Weiterleiten…" : "30 Tage kostenlos starten"}
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-slate-600">
        Monatlich kündbar · Keine versteckten Kosten
      </p>
    </div>
  );
}
