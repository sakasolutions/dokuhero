"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Building2, FileText, ThumbsUp, ThumbsDown, UserPlus } from "lucide-react";

type Stats = {
  betriebe_gesamt: number;
  protokolle_gesamt: number;
  bewertungen_positiv: number;
  bewertungen_negativ: number;
  registrierungen_heute: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) {
          if (res.status === 403) {
            if (!cancelled) setError("Kein Admin-Zugang.");
            return;
          }
          throw new Error("load");
        }
        const data = (await res.json()) as Stats;
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setError("Statistiken konnten nicht geladen werden.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    {
      label: "Betriebe gesamt",
      value: stats?.betriebe_gesamt ?? "–",
      icon: Building2,
    },
    {
      label: "Protokolle gesamt",
      value: stats?.protokolle_gesamt ?? "–",
      icon: FileText,
    },
    {
      label: "Bewertungen positiv",
      value: stats?.bewertungen_positiv ?? "–",
      icon: ThumbsUp,
    },
    {
      label: "Bewertungen negativ",
      value: stats?.bewertungen_negativ ?? "–",
      icon: ThumbsDown,
    },
    {
      label: "Neue Registrierungen heute",
      value: stats?.registrierungen_heute ?? "–",
      icon: UserPlus,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin-Übersicht</h1>
        <p className="mt-1 text-slate-600">Gesamtstatistiken über alle Betriebe.</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
                  {value}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-red-700">
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
