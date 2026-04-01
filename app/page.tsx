"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  HardHat,
  Mail,
  Menu,
  Mic,
  Send,
  Sparkles,
  Star,
  Wrench,
  X,
} from "lucide-react";

const steps = [
  {
    n: 1,
    icon: Camera,
    title: "Fotos + Sprache",
    text: "Vor Ort aufnehmen, fertig.",
  },
  {
    n: 2,
    icon: Sparkles,
    title: "KI schreibt",
    text: "Sauberer Protokolltext.",
  },
  {
    n: 3,
    icon: Send,
    title: "PDF raus",
    text: "Direkt beim Kunden.",
  },
];

const branchen = [
  {
    icon: Wrench,
    title: "KFZ",
    text: "Service & Schäden dokumentieren.",
  },
  {
    icon: HardHat,
    title: "Handwerk",
    text: "Baustelle festhalten, Büro sparen.",
  },
  {
    icon: Building2,
    title: "Hausmeister",
    text: "Objekte & Termine belegen.",
  },
  {
    icon: Sparkles,
    title: "Reinigung",
    text: "Leistungen klar fürs Büro.",
  },
];

const features = [
  {
    icon: Camera,
    title: "Foto-Upload & Sprachnotiz",
    text: "Mehrere Fotos, dazu kurz gesprochene Notiz — alles in einem Auftrag.",
  },
  {
    icon: Sparkles,
    title: "KI-Protokolltext",
    text: "Aus deinen Stichworten wird ein professioneller Fließtext.",
  },
  {
    icon: Mail,
    title: "PDF per Mail",
    text: "Versand an den Kunden, sobald du freigibst.",
  },
  {
    icon: Star,
    title: "Bewertungs-Automatik",
    text: "Feedback-Anfrage nach dem Einsatz — du behältst den Überblick.",
  },
];

function HeroMockCard() {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60 md:p-5"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-left">
        <ClipboardList className="h-5 w-5 shrink-0 text-primary" strokeWidth={2} />
        <span className="text-sm font-semibold text-slate-900">
          Neues Protokoll
        </span>
      </div>
      <p className="mt-3 text-left text-sm text-slate-600">
        Kunde:{" "}
        <span className="font-medium text-slate-800">Max Mustermann</span>
      </p>
      <div className="mt-3 flex gap-2">
        <div className="h-16 w-20 shrink-0 rounded-lg bg-slate-200" />
        <div className="h-16 w-20 shrink-0 rounded-lg bg-slate-200" />
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left">
        <Mic className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="text-sm italic text-slate-600">
          „Ölwechsel gemacht“
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-left text-sm">
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="landing-mock-typing font-medium text-slate-700">
          KI generiert…
        </span>
        <span
          className="landing-mock-cursor inline-block h-4 w-0.5 shrink-0 rounded-sm bg-primary"
          aria-hidden
        />
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-left text-sm font-medium text-green-700">
        <Check className="h-4 w-4 shrink-0 text-green-600" strokeWidth={2.5} />
        <span>PDF gesendet</span>
        <Mail className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const navLinkClass =
    "inline-flex min-h-12 items-center rounded-lg px-3 text-sm font-medium text-slate-700 transition hover:text-slate-900";

  return (
    <div className="min-h-screen bg-white text-slate-700">
      <header
        className={`sticky top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-200 ${
          scrolled
            ? "border-b border-slate-200/90 bg-white/90 backdrop-blur-md"
            : "border-b border-transparent bg-white/0"
        }`}
      >
        <div className="mx-auto flex h-14 min-h-[48px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-base font-bold tracking-tight text-slate-900 md:text-lg"
            onClick={closeMenu}
          >
            DokuHero
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Hauptnavigation"
          >
            <a href="#features" className={navLinkClass}>
              Funktionen
            </a>
            <a href="#pricing" className={navLinkClass}>
              Preise
            </a>
            <Link
              href="/login"
              className="ml-2 inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-slate-200 px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              Kostenlos testen
            </Link>
          </nav>

          <button
            type="button"
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg text-slate-900 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-nav"
            aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen ? (
          <div
            id="landing-mobile-nav"
            className="border-b border-slate-200 bg-white px-4 pb-4 shadow-lg md:hidden"
          >
            <div className="flex flex-col gap-1 pt-2">
              <a
                href="#features"
                className={`${navLinkClass} w-full justify-start`}
                onClick={closeMenu}
              >
                Funktionen
              </a>
              <a
                href="#pricing"
                className={`${navLinkClass} w-full justify-start`}
                onClick={closeMenu}
              >
                Preise
              </a>
              <Link
                href="/login"
                className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-lg border-2 border-slate-200 text-sm font-semibold text-slate-900"
                onClick={closeMenu}
              >
                Anmelden
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white"
                onClick={closeMenu}
              >
                Kostenlos testen
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-12 sm:py-16 md:py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center md:gap-12 lg:gap-16">
            <div className="text-left">
              <p className="inline-flex min-h-8 items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary md:text-sm">
                Neu: KI-Protokolle in 60 Sekunden
              </p>
              <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl md:mt-6 md:text-4xl lg:text-5xl">
                Schluss mit Papierkram.
                <span className="mt-1 block text-primary md:mt-2">
                  DokuHero erledigt das.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:mt-5 md:text-lg">
                Foto machen, kurz sprechen — fertig. Professionelles PDF beim
                Kunden, automatisch.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-md shadow-primary/25 transition hover:bg-primary/90 md:min-h-[52px] md:px-10 md:text-lg"
                >
                  Kostenlos starten
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-6 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-100 md:min-h-[52px]"
                >
                  Wie es funktioniert
                  <ChevronDown className="h-5 w-5" aria-hidden />
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-2 text-sm text-slate-600 md:mt-10">
                <div className="flex gap-0.5 text-amber-400" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <span>
                  Bereits von KFZ-Werkstätten und Handwerkern genutzt
                </span>
              </div>
            </div>
            <div className="mx-auto w-full max-w-md md:mx-0 md:max-w-none md:justify-self-end">
              <HeroMockCard />
            </div>
          </div>
        </section>

        {/* So funktioniert's */}
        <section
          id="how-it-works"
          className="scroll-mt-20 bg-white px-4 py-14 sm:py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">
              So funktioniert&apos;s
            </h2>
            <ol className="mx-auto mt-10 flex max-w-4xl flex-col gap-8 md:mt-14 md:flex-row md:gap-6 lg:gap-8">
              {steps.map(({ n, icon: Icon, title, text }) => (
                <li
                  key={n}
                  className="relative flex flex-1 flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-center md:pt-8"
                >
                  <div className="absolute -top-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">
                    {n}
                  </div>
                  <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Für wen */}
        <section
          id="branchen"
          className="scroll-mt-20 border-y border-slate-100 bg-slate-50 px-4 py-14 sm:py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">
              Für wen
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-600 md:text-base">
              Teams vor Ort, wenig Lust auf Schreibtischarbeit.
            </p>
            <ul className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 md:mt-12 md:gap-6">
              {branchen.map(({ icon: Icon, title, text }) => (
                <li
                  key={title}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md md:p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="scroll-mt-20 bg-white px-4 py-14 sm:py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">
              Funktionen
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-6 md:mt-14 md:grid-cols-2 md:gap-8">
              {features.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 md:p-8"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="scroll-mt-20 bg-slate-50 px-4 py-14 sm:py-16 md:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">
              Preise
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm text-slate-600 md:text-base">
              Einfache Pakete — du entscheidest, wie viel du protokollierst.
            </p>
            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 md:mt-14 md:grid-cols-2 md:gap-8">
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h3 className="text-lg font-bold text-slate-900">Starter</h3>
                <p className="mt-3 text-3xl font-extrabold text-primary md:text-4xl">
                  29€
                  <span className="text-base font-semibold text-slate-500 md:text-lg">
                    {" "}
                    /Monat
                  </span>
                </p>
                <p className="mt-4 text-slate-600">Bis 50 Protokolle</p>
                <Link
                  href="/register"
                  className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 sm:text-base"
                >
                  Kostenlos testen
                </Link>
              </div>
              <div className="relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
                <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white sm:right-6">
                  Beliebt
                </span>
                <h3 className="text-lg font-bold text-white">Pro</h3>
                <p className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
                  59€
                  <span className="text-base font-semibold text-slate-400 md:text-lg">
                    {" "}
                    /Monat
                  </span>
                </p>
                <p className="mt-4 text-slate-300">Unbegrenzt Protokolle</p>
                <Link
                  href="/register"
                  className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 sm:text-base"
                >
                  Kostenlos testen
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 px-4 py-10 text-slate-400 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <p className="order-2 text-center text-sm sm:order-1 sm:text-left">
            © 2026 DokuHero
          </p>
          <nav className="order-1 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm sm:order-2">
            <Link
              href="/datenschutz"
              className="min-h-12 min-w-[48px] inline-flex items-center justify-center font-medium transition hover:text-white"
            >
              Datenschutz
            </Link>
            <Link
              href="/impressum"
              className="min-h-12 min-w-[48px] inline-flex items-center justify-center font-medium transition hover:text-white"
            >
              Impressum
            </Link>
            <a
              href="mailto:kontakt@dokuhero.de"
              className="min-h-12 min-w-[48px] inline-flex items-center justify-center font-medium transition hover:text-white"
            >
              Kontakt
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
