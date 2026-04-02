"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ClipboardList, FileText, Users, Wrench } from "lucide-react";
import type { DashboardStats } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [betriebName, setBetriebName] = useState("Betrieb");
  const [paymentOk, setPaymentOk] = useState(false);

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
  const starterLimitWarn = starterLimit != null && starterLimitPct > 80;

  const cards = [
    {
      label: "Kunden gesamt",
      value: stats?.kundenGesamt ?? "–",
      icon: Users,
    },
    {
      label: "Aufträge heute",
      value: stats?.auftraegeHeute ?? "–",
      icon: Wrench,
    },
    {
      label: "Protokolle diese Woche",
      value: stats?.protokolleDieseWoche ?? "–",
      icon: FileText,
    },
    {
      label: "Offene Aufträge",
      value: stats?.offeneAuftraege ?? "–",
      icon: ClipboardList,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Hallo, {betriebName}
        </h1>
        <p className="mt-1 text-slate-600">
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

      {starterLimit != null ? (
        <div
          className={`rounded-xl border bg-white p-4 shadow-sm ${
            starterLimitWarn ? "border-red-200/90" : "border-slate-200"
          }`}
        >
          <p className="text-sm font-medium text-slate-700">
            <span className="tabular-nums text-slate-900">
              {protokolleMonatUsed}
            </span>
            {" / "}
            <span className="tabular-nums text-slate-900">{starterLimit}</span>{" "}
            Protokolle diesen Monat
          </p>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={Math.min(protokolleMonatUsed, starterLimit)}
            aria-valuemin={0}
            aria-valuemax={starterLimit}
          >
            <div
              className={`h-full rounded-full transition-[width] ${
                starterLimitWarn ? "bg-red-600" : "bg-primary"
              }`}
              style={{
                width: `${Math.min(100, starterLimitPct)}%`,
              }}
            />
          </div>
          {starterLimitWarn ? (
            <p className="mt-3 text-sm text-slate-700">
              Du hast {protokolleMonatUsed} von {starterLimit} Protokollen
              verbraucht.{" "}
              <Link
                href="/preise"
                className="font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary/90"
              >
                Upgrade empfohlen.
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
                  {value}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-primary">
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
