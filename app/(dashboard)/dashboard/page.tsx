"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ClipboardList, FileText, Users, Wrench } from "lucide-react";
import type { DashboardStats } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [betriebName, setBetriebName] = useState("Betrieb");

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
    <div className="mx-auto max-w-6xl space-y-8">
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
    </div>
  );
}
