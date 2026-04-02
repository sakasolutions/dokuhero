"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  AlertTriangle,
  ClipboardList,
  FileText,
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
        <Link
          href="/auftraege?freigabe=1"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm transition hover:border-amber-300 hover:bg-amber-50/90"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-lg"
            aria-hidden
          >
            ⚠️
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
              {stats?.protokolle_zur_pruefung} Protokoll
              {(stats?.protokolle_zur_pruefung ?? 0) === 1 ? "" : "e"} warten
              auf deine Freigabe
            </span>
            <span className="mt-1 block text-sm text-amber-800/90">
              Zur Auftragsliste – nur Einträge mit Protokoll „zur Prüfung“.
            </span>
          </span>
        </Link>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card padding={false} className="p-4">
            <p className="text-sm text-slate-700">
              <span className="mr-1.5" aria-hidden>
                👍
              </span>
              <span className="font-semibold tabular-nums text-green-600">
                {stats?.bewertungen_positiv ?? "–"}
              </span>{" "}
              zufrieden
            </p>
          </Card>
          <Card padding={false} className="p-4">
            <p className="text-sm text-slate-700">
              <span className="mr-1.5" aria-hidden>
                👎
              </span>
              <span className="font-semibold tabular-nums text-red-600">
                {stats?.bewertungen_negativ ?? "–"}
              </span>{" "}
              Feedback
            </p>
          </Card>
        </div>
        {stats?.letztes_feedback ? (
          <div
            className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-dark"
            role="status"
          >
            <p className="font-medium text-dark">Letztes Feedback</p>
            <p className="mt-1 whitespace-pre-wrap text-dark/90">
              {stats.letztes_feedback}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
