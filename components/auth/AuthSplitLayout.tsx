"use client";

import Link from "next/link";
import { Check, FileText } from "lucide-react";

type DesktopAuthLink = {
  href: string;
  preface: string;
  label: string;
};

export function AuthSplitLayout({
  children,
  desktopAuthLink,
}: {
  children: React.ReactNode;
  desktopAuthLink: DesktopAuthLink;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Brand — Desktop only */}
      <aside className="relative hidden h-screen flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 lg:sticky lg:top-0 lg:flex">
        <div className="flex h-full min-h-0 flex-col justify-between p-12">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-bold text-white outline-none ring-offset-2 ring-offset-slate-900 focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                <FileText className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
              </span>
              <span className="text-lg font-bold">DokuHero</span>
            </Link>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center py-10">
            <div className="max-w-md">
              <h2 className="text-3xl font-bold leading-tight text-white">
                Dokumentation die sich von selbst erledigt.
              </h2>
              <p className="mt-4 text-lg text-blue-200">
                Foto machen, kurz sprechen — fertig.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "30 Tage kostenlos testen",
                  "Keine Kreditkarte nötig",
                  "DSGVO-konform & Made in Germany",
                ].map((line) => (
                  <div
                    key={line}
                    className="flex items-center gap-3 text-blue-100"
                  >
                    <Check
                      className="h-5 w-5 shrink-0 text-blue-300"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <blockquote className="text-sm italic text-blue-300">
            <p>&ldquo;Endlich kein Papierkram mehr nach der Arbeit.&rdquo;</p>
            <footer className="mt-2 not-italic text-blue-400/90">
              — KFZ-Werkstatt, München
            </footer>
          </blockquote>
        </div>
      </aside>

      {/* Formular */}
      <div className="flex h-screen min-h-0 flex-col overflow-y-auto bg-slate-50">
        <div className="flex shrink-0 justify-end p-4 lg:hidden">
          <Link
            href="/"
            className="text-sm text-slate-500 transition hover:text-slate-800"
          >
            ← Zurück zur Startseite
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-8 py-8 lg:px-16 lg:py-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 hidden justify-end text-sm text-slate-500 lg:flex">
              <span>
                {desktopAuthLink.preface}{" "}
                <Link
                  href={desktopAuthLink.href}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {desktopAuthLink.label}
                </Link>
              </span>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
