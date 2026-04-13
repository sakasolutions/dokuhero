"use client";

import Link from "next/link";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";

/**
 * Statische Optik – keine Registrierung, kein Backend.
 */
export default function RegisterPage() {
  return (
    <AuthSplitLayout>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Registrieren</h1>
      <p className="mt-2 text-sm text-slate-600">
        Die Anwendung ist derzeit nicht verfügbar. Diese Seite dient nur der Darstellung.
      </p>
      <div className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Betrieb</label>
          <input
            type="text"
            readOnly
            placeholder="Ihr Betriebsname"
            className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">E-Mail</label>
          <input
            type="email"
            readOnly
            placeholder="beispiel@firma.de"
            className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Passwort</label>
          <input
            type="password"
            readOnly
            placeholder="••••••••"
            className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
          />
        </div>
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-lg bg-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-500"
        >
          Konto anlegen (nicht aktiv)
        </button>
      </div>
      <p className="mt-8 text-center text-sm text-slate-600">
        <Link href="/" className="font-medium text-primary hover:underline">
          Zur Startseite
        </Link>
        {" · "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Anmelden
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
