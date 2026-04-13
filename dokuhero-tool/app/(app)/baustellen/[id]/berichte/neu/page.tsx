"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SprachEingabe } from "@/components/sprache/SprachEingabe";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

export default function BerichtNeuPage() {
  const params = useParams();
  const router = useRouter();
  const baustelleId = String(params.id);
  const created = useRef(false);
  const [berichtId, setBerichtId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (created.current) return;
    created.current = true;
    void (async () => {
      const res = await fetch(`/api/baustellen/${baustelleId}/berichte`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setErr("Bericht konnte nicht angelegt werden.");
        return;
      }
      const j = (await res.json()) as { id: number };
      setBerichtId(j.id);
    })();
  }, [baustelleId]);

  async function save() {
    if (berichtId == null) return;
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/berichte/${berichtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_note: note }),
      });
      if (!res.ok) setErr("Speichern fehlgeschlagen.");
      else router.push(`/berichte/${berichtId}`);
    } finally {
      setSaving(false);
    }
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (berichtId == null) return;
    const files = e.target.files;
    if (!files?.length) return;
    const fotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      fotos.push(await fileToBase64(files[i]!));
    }
    setErr(null);
    const res = await fetch(`/api/berichte/${berichtId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fotos }),
    });
    if (!res.ok) setErr("Fotos konnten nicht gespeichert werden.");
    e.target.value = "";
  }

  if (err && berichtId == null) {
    return (
      <div>
        <p className="text-red-600">{err}</p>
        <Link href={`/baustellen/${baustelleId}`} className="text-sm text-slate-600">
          Zurück
        </Link>
      </div>
    );
  }

  if (berichtId == null) {
    return <p className="text-sm text-slate-500">Bericht wird angelegt …</p>;
  }

  return (
    <div className="space-y-6">
      <Link href={`/baustellen/${baustelleId}`} className="text-sm text-slate-600 hover:text-slate-900">
        ← Baustelle
      </Link>
      <h1 className="text-xl font-semibold">Bericht erfassen</h1>
      <SprachEingabe
        onTranscript={(t) => setNote((prev) => (prev ? `${prev}\n${t}` : t))}
      />
      <div>
        <label className="block text-sm font-medium text-slate-700">Notiz</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={8}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Fotos</label>
        <input type="file" accept="image/*" multiple onChange={(e) => void onFiles(e)} className="mt-1 text-sm" />
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "…" : "Speichern & weiter"}
        </button>
      </div>
    </div>
  );
}
