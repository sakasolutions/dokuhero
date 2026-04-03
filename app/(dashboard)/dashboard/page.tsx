"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  ClipboardList,
  FileText,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";
import type { DashboardStats } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [betriebName, setBetriebName] = useState("Betrieb");
  const [paymentOk, setPaymentOk] = useState(false);
  const [greeting, setGreeting] = useState("Hallo");

  useEffect(() => {
    const hour = new Date().toLocaleString("de-DE", {
      timeZone: "Europe/Berlin",
      hour: "numeric",
      hour12: false,
    });
    const h = parseInt(hour, 10);
    if (h < 12) setGreeting("Guten Morgen");
    else if (h < 18) setGreeting("Guten Tag");
    else setGreeting("Guten Abend");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) {
          if (res.status === 401) {
            setError("Nicht angemeldet.");
            return;
          }
          throw new Error("load");
        }
        const data = (await res.json()) as DashboardStats;
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setError("Statistiken konnten nicht geladen werden.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Betriebsname ausschließlich aus der API (nicht aus der Session). */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/einstellungen");
        if (!res.ok) return;
        const j = (await res.json()) as {
          betrieb?: { name?: string };
        };
        const n = j.betrieb?.name?.trim();
        if (!cancelled && n) setBetriebName(n);
      } catch {
        /* Fallback bleibt „Betrieb“ */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("payment");
    if (p === "success") {
      setPaymentOk(true);
      const t = window.setTimeout(() => setPaymentOk(false), 5000);
      return () => window.clearTimeout(t);
    }
  }, []);

  const starterLimit = stats?.protokoll_limit;
  const protokolleMonatUsed = stats?.protokolle_monat ?? 0;
  const starterLimitPct =
    starterLimit != null && starterLimit > 0
      ? (protokolleMonatUsed / starterLimit) * 100
      : 0;
  const protokolleUebrig =
    starterLimit != null
      ? Math.max(0, starterLimit - protokolleMonatUsed)
      : 0;
  const progressBarFillClass =
    starterLimitPct > 95
      ? "bg-red-500"
      : starterLimitPct >= 80
        ? "bg-orange-500"
        : "bg-blue-500";
  const progressCardBorderClass =
    starterLimitPct > 95
      ? "border-red-200/90"
      : starterLimitPct >= 80
        ? "border-orange-200/90"
        : "border-slate-200";

  const cards = [
    {
      label: "Kunden gesamt",
      value: stats?.kundenGesamt ?? "–",
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      label: "Aufträge heute",
      value: stats?.auftraegeHeute ?? "–",
      icon: Wrench,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
    {
      label: "Protokolle diese Woche",
      value: stats?.protokolleDieseWoche ?? "–",
      icon: FileText,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-500",
    },
    {
      label: "Offene Aufträge",
      value: stats?.offeneAuftraege ?? "–",
      icon: ClipboardList,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {betriebName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Hier ist deine Übersicht für heute.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      {paymentOk ? (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          role="status"
        >
          Zahlung erfolgreich! Dein Plan ist jetzt aktiv.
        </div>
      ) : null}

      {(stats?.protokolle_zur_pruefung ?? 0) > 0 ? (
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4"
          role="status"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="shrink-0 rounded-lg bg-amber-100 p-2">
              <TriangleAlert
                className="h-5 w-5 text-amber-600"
                strokeWidth={2}
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {(stats?.protokolle_zur_pruefung ?? 0) === 1
                  ? "1 Protokoll ist zur Freigabe bereit"
                  : `${stats?.protokolle_zur_pruefung} Protokolle sind zur Freigabe bereit`}
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Bitte prüfe und gib sie frei.
              </p>
            </div>
          </div>
          <Link
            href="/auftraege?freigabe=1"
            className="ml-4 shrink-0 text-sm font-medium whitespace-nowrap text-amber-700 hover:text-amber-900"
          >
            Zur Freigabe →
          </Link>
        </div>
      ) : null}

      {starterLimit != null ? (
        <div
          className={`rounded-xl border bg-white p-4 shadow-sm ${progressCardBorderClass}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-700">
              <span className="tabular-nums text-slate-900">
                {protokolleMonatUsed}
              </span>
              {" / "}
              <span className="tabular-nums text-slate-900">
                {starterLimit}
              </span>{" "}
              Protokolle diesen Monat
            </p>
            <span className="text-sm text-slate-400">
              {protokolleUebrig} übrig
            </span>
          </div>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={Math.min(protokolleMonatUsed, starterLimit)}
            aria-valuemin={0}
            aria-valuemax={starterLimit}
          >
            <div
              className={`h-full rounded-full transition-[width] ${progressBarFillClass}`}
              style={{
                width: `${Math.min(100, starterLimitPct)}%`,
              }}
            />
          </div>
          {starterLimitPct > 80 ? (
            <p className="mt-1 text-xs text-orange-500">
              Fast erreicht — upgrade für unbegrenzte Protokolle
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <Card key={label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500 font-medium">{label}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                  {value}
                </p>
              </div>
              <div
                className={`rounded-xl p-2.5 ${iconBg} ${iconColor}`}
              >
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">
          Bewertungen
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-1 flex items-center gap-2">
              <div
                className="h-2 w-2 shrink-0 rounded-full bg-green-500"
                aria-hidden
              />
              <span className="text-sm font-medium text-slate-600">
                Zufrieden
              </span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-slate-900">
              {stats?.bewertungen_positiv ?? "–"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-1 flex items-center gap-2">
              <div
                className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                aria-hidden
              />
              <span className="text-sm font-medium text-slate-600">
                Feedback
              </span>
            </div>
            <p className="text-3xl font-bold tabular-nums text-slate-900">
              {stats?.bewertungen_negativ ?? "–"}
            </p>
          </div>
        </div>
        {stats?.letztes_feedback ? (
          <div
            className="mt-4 rounded-xl border border-slate-200 bg-white p-4"
            role="status"
          >
            <p className="mb-1 text-xs text-slate-400">Letztes Feedback</p>
            <p className="whitespace-pre-wrap text-sm italic text-slate-700">
              &ldquo;{stats.letztes_feedback}&rdquo;
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
