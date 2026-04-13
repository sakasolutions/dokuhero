"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Payload = {
  bericht: {
    id: number;
    baustelle_id: number;
    report_date: string;
    raw_note: string | null;
    formatted_text: string | null;
    pdf_path: string | null;
    status: string;
  };
  baustelle: { id: number; name: string; address: string | null } | null;
  fotos: { id: number; file_path: string }[];
};

export default function BerichtDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch(`/api/berichte/${id}`);
    if (!res.ok) {
      setErr("Nicht gefunden.");
      setData(null);
      return;
    }
    setData((await res.json()) as Payload);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function formulieren() {
    setBusy("form");
    setErr(null);
    try {
      const res = await fetch(`/api/berichte/${id}/formulieren`, { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : "Fehler");
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function pdf() {
    setBusy("pdf");
    setErr(null);
    try {
      const res = await fetch(`/api/berichte/${id}/pdf`, { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : "PDF fehlgeschlagen");
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (!data?.bericht) {
    return <p className="text-sm text-slate-500">{err ?? "Laden …"}</p>;
  }

  const b = data.bericht;
  const back = `/baustellen/${b.baustelle_id}`;

  return (
    <div className="space-y-6">
      <Link href={back} className="text-sm text-slate-600 hover:text-slate-900">
        ← Baustelle
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Bericht #{b.id}</h1>
        <p className="text-sm text-slate-600">
          {data.baustelle?.name ?? "—"} · {b.report_date} ·{" "}
          <span className="uppercase">{b.status}</span>
        </p>
      </div>

      {b.raw_note ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Rohnotiz</div>
          <pre className="mt-2 whitespace-pre-wrap text-sm">{b.raw_note}</pre>
        </div>
      ) : null}

      {b.formatted_text ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Formuliert</div>
          <pre className="mt-2 whitespace-pre-wrap text-sm">{b.formatted_text}</pre>
        </div>
      ) : null}

      {data.fotos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {data.fotos.map((f) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f.id} src={f.file_path} alt="" className="rounded border border-slate-200" />
          ))}
        </div>
      ) : null}

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void formulieren()}
          disabled={busy !== null}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === "form" ? "…" : "Formulieren (KI)"}
        </button>
        <button
          type="button"
          onClick={() => void pdf()}
          disabled={busy !== null}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy === "pdf" ? "…" : "PDF erzeugen"}
        </button>
        {b.pdf_path ? (
          <a
            href={b.pdf_path}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            PDF öffnen
          </a>
        ) : null}
      </div>
    </div>
  );
}
