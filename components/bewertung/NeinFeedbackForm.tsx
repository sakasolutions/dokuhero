"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function NeinFeedbackForm({ token }: { token: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = text.trim();
    if (!t) {
      setError("Bitte beschreiben Sie kurz Ihr Anliegen.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/bewertung/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, feedback_text: t }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Senden fehlgeschlagen.");
        return;
      }
      setDone(true);
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-emerald-900">
        <p className="text-lg font-semibold">Vielen Dank</p>
        <p className="mt-2 text-sm">
          Ihr Feedback wurde übermittelt. Der Betrieb wurde informiert.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(ev) => void onSubmit(ev)} className="mt-6 space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <label htmlFor="fb" className="block text-sm font-medium text-slate-700">
        Ihr Feedback
      </label>
      <textarea
        id="fb"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder="Was können wir besser machen?"
        disabled={busy}
      />
      <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
        {busy ? "Wird gesendet…" : "Absenden"}
      </Button>
    </form>
  );
}
