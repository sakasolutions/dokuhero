"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BaustelleCreateForm } from "@/components/baustellen/BaustelleCreateForm";

type Row = {
  id: number;
  name: string;
  address: string | null;
  customer_name: string | null;
};

export default function BaustellenPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [load, setLoad] = useState(true);
  const [listErr, setListErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setListErr(null);
    const res = await fetch("/api/baustellen");
    if (!res.ok) {
      setRows([]);
      setListErr("Baustellen konnten nicht geladen werden.");
      return;
    }
    const j = (await res.json()) as { baustellen: Row[] };
    setRows(j.baustellen ?? []);
  }, []);

  useEffect(() => {
    void reload().finally(() => setLoad(false));
  }, [reload]);

  const onCreated = useCallback(
    (id: number) => {
      void reload();
      router.push(`/baustellen/${id}`);
    },
    [reload, router]
  );

  if (load) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (listErr) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{listErr}</p>
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => {
            setLoad(true);
            void reload().finally(() => setLoad(false));
          }}
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Baustelle anlegen</h1>
          <p className="mt-1 text-sm text-slate-600">
            Lege zuerst eine Baustelle an — danach kannst du Berichte und Fotos erfassen.
          </p>
        </div>
        <BaustelleCreateForm onCreated={onCreated} title="Erste Baustelle" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Baustellen</h1>
        <p className="mt-1 text-sm text-slate-600">Auswählen oder anlegen</p>
      </div>
      <BaustelleCreateForm onCreated={onCreated} />
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Alle</h2>
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {rows.map((b) => (
            <li key={b.id}>
              <Link href={`/baustellen/${b.id}`} className="block px-4 py-3 hover:bg-slate-50">
                <div className="font-medium text-slate-900">{b.name}</div>
                {b.customer_name ? (
                  <div className="text-sm text-slate-600">{b.customer_name}</div>
                ) : null}
                {b.address ? <div className="text-sm text-slate-500">{b.address}</div> : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
