"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SprachEingabe } from "@/components/sprache/SprachEingabe";
import { BerichtActions } from "@/components/berichte/BerichtActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";

function toB64(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result ?? ""));
    r.onerror = () => rej(new Error("read"));
    r.readAsDataURL(f);
  });
}

type BerichtRow = {
  title: string;
  report_date: string;
  raw_note: string | null;
  formatted_text: string | null;
  status: string;
  pdf_path: string | null;
};

export default function BerichtNeuPage() {
  const params = useParams();
  const bid = String(params.id);
  const created = useRef(false);
  const [rid, setRid] = useState<number | null>(null);
  const [title, setTitle] = useState("Bericht");
  const [rd, setRd] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [formatted, setFormatted] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const statusRef = useRef("draft");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fotoBusy, setFotoBusy] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const [actionsBusy, setActionsBusy] = useState(false);
  const hydrateGen = useRef(0);
  const patchChain = useRef(Promise.resolve());

  const applyBericht = useCallback((b: BerichtRow) => {
    setStatus(b.status);
    statusRef.current = b.status;
    setFormatted(b.formatted_text);
    setPdfPath(b.pdf_path);
    setTitle(b.title);
    const raw = String(b.report_date ?? "");
    const rdStr = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(rdStr)) setRd(rdStr);
    setNote(b.raw_note ?? "");
  }, []);

  const hydrateFromServer = useCallback(async () => {
    if (rid == null) return;
    const gen = ++hydrateGen.current;
    const res = await fetch(`/api/berichte/${rid}`);
    if (!res.ok) return;
    if (gen !== hydrateGen.current) return;
    const j = (await res.json()) as { bericht: BerichtRow };
    applyBericht(j.bericht);
  }, [rid, applyBericht]);

  useEffect(() => {
    if (created.current) return;
    created.current = true;
    void (async () => {
      const res = await fetch(`/api/baustellen/${bid}/berichte`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setErr("Bericht konnte nicht angelegt werden.");
        return;
      }
      const j = (await res.json()) as { id: number };
      setRid(j.id);
    })();
  }, [bid]);

  useEffect(() => {
    if (rid == null) return;
    void hydrateFromServer();
  }, [rid, hydrateFromServer]);

  const patchDraft = useCallback((): Promise<boolean> => {
    if (rid == null) return Promise.resolve(false);
    const result: Promise<boolean> = patchChain.current.then(async (): Promise<boolean> => {
      const isDraft = statusRef.current === "draft";
      const body = isDraft
        ? { title: title.trim(), raw_note: note, report_date: rd }
        : { title: title.trim(), report_date: rd };
      const res = await fetch(`/api/berichte/${rid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return false;
      await hydrateFromServer();
      return true;
    });
    patchChain.current = result.then(() => undefined).catch(() => undefined);
    return result;
  }, [rid, title, note, rd, hydrateFromServer]);

  async function saveDraft() {
    setBusy(true);
    setErr(null);
    try {
      const ok = await patchDraft();
      if (!ok) {
        setErr("Speichern fehlgeschlagen.");
        return;
      }
      setSavedHint(true);
      setTimeout(() => setSavedHint(false), 3500);
    } finally {
      setBusy(false);
    }
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (rid == null || !e.target.files?.length) return;
    setFotoBusy(true);
    setErr(null);
    try {
      const fotos: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        fotos.push(await toB64(e.target.files[i]!));
      }
      const res = await fetch(`/api/berichte/${rid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotos }),
      });
      if (!res.ok) setErr("Fotos fehlgeschlagen.");
      else await hydrateFromServer();
    } finally {
      setFotoBusy(false);
      e.target.value = "";
    }
  }

  if (err && rid === null) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{err}</p>
        <Link href={`/baustellen/${bid}`} className="text-sm font-medium text-primary hover:underline">
          Zurück zur Baustelle
        </Link>
      </div>
    );
  }

  if (rid === null) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Bericht wird angelegt">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-36 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/baustellen/${bid}`} className="text-sm font-medium text-primary hover:underline">
          ← Baustelle
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Bericht erstellen</h1>
      </div>

      <SprachEingabe prominent onText={(t) => setNote((p) => (p ? `${p}\n${t}` : t))} />

      <Card className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-800">Titel</label>
          <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-800">Datum</label>
          <Input type="date" className="mt-1" value={rd} onChange={(e) => setRd(e.target.value)} />
        </div>
      </Card>

      <Card className="space-y-3">
        <label className="text-sm font-medium text-slate-800">Notiz / Stichpunkte</label>
        <Textarea
          rows={10}
          className="mt-1 min-h-[200px] font-normal leading-relaxed"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Hier tippen oder per Sprache ergänzen …"
          readOnly={status !== "draft"}
          aria-readonly={status !== "draft"}
        />
        {status !== "draft" ? (
          <p className="text-xs text-slate-500">Notiz ist nach der KI-Formulierung fest (Serverstand).</p>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <label className="text-sm font-medium text-slate-800">Fotos</label>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={fotoBusy}
          className="mt-1 block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-200"
          onChange={(e) => void onFiles(e)}
        />
        {fotoBusy ? <p className="text-sm text-slate-500">Fotos werden hochgeladen …</p> : null}
      </Card>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {savedHint ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          Entwurf gespeichert
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" disabled={busy || actionsBusy} onClick={() => void saveDraft()}>
          {busy ? "Speichern …" : "Entwurf speichern"}
        </Button>
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Auswertung</h2>
        <p className="mt-1 text-sm text-slate-600">
          Notiz speichern, dann Text optimieren. PDF ist erst nach der KI-Formulierung möglich.
        </p>
        <div className="mt-4">
          <BerichtActions
            berichtId={rid}
            hasNote={!!note.trim()}
            hasFormatted={!!formatted?.trim()}
            pdfPath={pdfPath}
            onUpdated={() => hydrateFromServer()}
            ensureSynced={patchDraft}
            onBusyChange={setActionsBusy}
          />
        </div>
      </Card>
    </div>
  );
}
