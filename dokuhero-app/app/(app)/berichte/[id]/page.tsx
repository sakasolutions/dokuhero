"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BerichtActions } from "@/components/berichte/BerichtActions";
import { Card } from "@/components/ui/Card";

type Payload = {
  bericht: {
    id: number;
    baustelle_id: number;
    title: string;
    raw_note: string | null;
    formatted_text: string | null;
    status: string;
    report_date: string;
    pdf_path: string | null;
  };
  baustelle: { name: string } | null;
  fotos: { id: number; file_path: string }[];
};

export default function BerichtDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [data, setData] = useState<Payload | null>(null);
  const [load, setLoad] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setErr(null);
    const res = await fetch(`/api/berichte/${id}`);
    if (!res.ok) {
      setData(null);
      if (res.status === 404) setErr("Bericht nicht gefunden.");
      else setErr("Laden fehlgeschlagen.");
      return;
    }
    setData((await res.json()) as Payload);
  }, [id]);

  useEffect(() => {
    setLoad(true);
    void fetchData().finally(() => setLoad(false));
  }, [id, fetchData]);

  if (load) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500" aria-busy="true">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Laden …
      </div>
    );
  }

  if (!data?.bericht) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{err ?? "Nicht gefunden."}</p>
        <Link href="/baustellen" className="text-sm font-medium text-primary hover:underline">
          Zurück zu den Baustellen
        </Link>
      </div>
    );
  }

  const r = data.bericht;
  const back = `/baustellen/${r.baustelle_id}`;

  return (
    <div className="space-y-6">
      <Link href={back} className="text-sm font-medium text-primary hover:underline">
        ← Baustelle
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{r.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {data.baustelle?.name ?? "—"} · {r.report_date} · <span className="uppercase">{r.status}</span>
        </p>
      </div>
      {r.raw_note ? (
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Notiz</h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{r.raw_note}</pre>
        </Card>
      ) : null}
      {r.formatted_text ? (
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Formuliert</h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{r.formatted_text}</pre>
        </Card>
      ) : null}
      {data.fotos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.fotos.map((f) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f.id} src={f.file_path} alt="" className="rounded-lg border border-slate-200" />
          ))}
        </div>
      ) : null}
      <Card>
        <BerichtActions
          berichtId={r.id}
          hasNote={!!r.raw_note?.trim()}
          hasFormatted={!!r.formatted_text?.trim()}
          pdfPath={r.pdf_path}
          onUpdated={fetchData}
        />
      </Card>
    </div>
  );
}
