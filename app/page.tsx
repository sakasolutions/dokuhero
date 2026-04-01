import Link from "next/link";
import {
  Camera,
  Car,
  FileText,
  Home,
  Mail,
  Star,
  Wrench,
  Droplets,
} from "lucide-react";

const iconBox =
  "mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-slate-800"
          >
            DokuHero
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-amber-500 hover:text-amber-600"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              Registrieren
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-100 bg-slate-50/50 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Protokolle in 60 Sekunden. Automatisch.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              Foto machen, kurz sprechen — DokuHero erstellt das professionelle PDF
              und schickt es direkt an deinen Kunden.
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-800 px-8 py-3 text-base font-semibold text-white shadow-md transition hover:bg-slate-700"
              >
                Kostenlos testen
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-8 py-3 text-base font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Anmelden
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
              So funktioniert&apos;s
            </h2>
            <ol className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3">
              <li className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className={iconBox} aria-hidden>
                  <Camera className="h-7 w-7" strokeWidth={2} />
                </div>
                <p className="mt-4 font-semibold text-slate-900">
                  Foto machen + Notiz sprechen
                </p>
              </li>
              <li className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className={iconBox} aria-hidden>
                  <Star className="h-7 w-7" strokeWidth={2} />
                </div>
                <p className="mt-4 font-semibold text-slate-900">
                  KI erstellt professionellen Text
                </p>
              </li>
              <li className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <div className={iconBox} aria-hidden>
                  <FileText className="h-7 w-7" strokeWidth={2} />
                </div>
                <p className="mt-4 font-semibold text-slate-900">
                  PDF geht automatisch an den Kunden
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-slate-50/50 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
              Funktionen
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Camera,
                  title: "Auftragsprotokoll mit Fotos",
                  text: "Alles dokumentieren, was vor Ort passiert — klar und nachvollziehbar.",
                },
                {
                  icon: FileText,
                  title: "KI-Protokolltext auf Knopfdruck",
                  text: "Aus Stichworten und Sprache wird ein sauberer Protokolltext.",
                },
                {
                  icon: Mail,
                  title: "Automatischer PDF-Versand per Mail",
                  text: "Dein Kunde erhält das PDF direkt — ohne Extra-Aufwand.",
                },
                {
                  icon: Star,
                  title: "Bewertungs-Automatik nach 2 Stunden",
                  text: "Zufriedenheits-Feedback kommt von selbst — du bleibst informiert.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
              Für wen
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
              Gebaut für Betriebe, die vor Ort arbeiten und wenig Zeit für Bürokratie
              haben.
            </p>
            <ul className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
              {[
                {
                  icon: Car,
                  title: "KFZ-Werkstätten",
                  text: "Service und Reparatur sauber dokumentieren — inklusive Fotos vom Fahrzeug.",
                },
                {
                  icon: Home,
                  title: "Hausmeisterdienste",
                  text: "Objekte und Arbeiten festhalten, ohne lange am Schreibtisch zu sitzen.",
                },
                {
                  icon: Wrench,
                  title: "Handwerker",
                  text: "Ob Elektrik, Sanitär oder Tischler: Protokoll und Kunde sind schnell bedient.",
                },
                {
                  icon: Droplets,
                  title: "Reinigungsfirmen",
                  text: "Einsätze und Leistungen klar belegen — professionell fürs Büro des Kunden.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <li
                  key={title}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-slate-50/50 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
              Preise
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              Einfache Pakete — du entscheidest, wie viel du protokollierst.
            </p>
            <div className="mx-auto mt-12 grid max-w-3xl gap-8 lg:grid-cols-2">
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Starter</h3>
                <p className="mt-2 text-3xl font-extrabold text-amber-500">
                  29€
                  <span className="text-base font-semibold text-slate-500">
                    /Monat
                  </span>
                </p>
                <p className="mt-4 text-slate-600">Bis 50 Protokolle</p>
                <Link
                  href="/register"
                  className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-800 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Kostenlos testen
                </Link>
              </div>
              <div className="flex flex-col rounded-2xl border-2 border-amber-500 bg-white p-8 shadow-md ring-1 ring-amber-500/20">
                <h3 className="text-lg font-bold text-slate-900">Pro</h3>
                <p className="mt-2 text-3xl font-extrabold text-amber-500">
                  59€
                  <span className="text-base font-semibold text-slate-500">
                    /Monat
                  </span>
                </p>
                <p className="mt-4 text-slate-600">Unbegrenzt Protokolle</p>
                <Link
                  href="/register"
                  className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-800 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Kostenlos testen
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <p className="text-sm text-slate-600">© 2026 DokuHero</p>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link
              href="/datenschutz"
              className="font-medium text-amber-500 hover:text-amber-600"
            >
              Datenschutz
            </Link>
            <Link
              href="/impressum"
              className="font-medium text-amber-500 hover:text-amber-600"
            >
              Impressum
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
