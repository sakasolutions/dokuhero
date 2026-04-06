"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  fadeUp,
  fadeUpDelay,
  staggerContainer,
  staggerItem,
  staggerItemPro,
  viewportOnce,
} from "@/lib/animations";

const ctaBtnTransform =
  "transition-transform duration-200 md:hover:scale-105 active:scale-95";

type Billing = "monthly" | "yearly";

// ⚠️ STRIPE PREISE MÜSSEN ANGEPASST WERDEN:
// Starter Monatlich: 30,00€ brutto (price_1THqxtJ4dcGJEa2GrvmUN9YT)
// Starter Jährlich: 300,00€ brutto (price_1THqxtJ4dcGJEa2GCSMPEpxj)
// Pro Monatlich: 70,00€ brutto (price_1THhWvJ4dcGJEa2GeTQZUwoJ)
// Pro Jährlich: 700,00€ brutto (price_1THhWvJ4dcGJEa2G1zIKXiZP)
// Business Monatlich: 175,00€ brutto (price_1THqFBJ4dcGJEa2G0KR0hQ3E)
// Business Jährlich: 1.750,00€ brutto (price_1THqFBJ4dcGJEa2Gg7fMTOHg)
const PRICE_IDS = {
  starter: {
    monthly: "price_1THqxtJ4dcGJEa2GrvmUN9YT",
    yearly: "price_1THqxtJ4dcGJEa2GCSMPEpxj",
  },
  pro: {
    monthly: "price_1THhWvJ4dcGJEa2GeTQZUwoJ",
    yearly: "price_1THhWvJ4dcGJEa2G1zIKXiZP",
  },
  business: {
    monthly: "price_1THqFBJ4dcGJEa2G0KR0hQ3E",
    yearly: "price_1THqFBJ4dcGJEa2Gg7fMTOHg",
  },
} as const;

const starterFeatures = [
  "50 Protokolle/Monat",
  "Protokolltext",
  "PDF-Generierung",
  "Automatischer Mail-Versand",
  "Bewertungs-Automatik",
];

const proFeatures = [
  "350 Protokolle/Monat",
  "Alles aus Starter",
  "Priority Support",
  "Early Access zu neuen Features",
  "GoBD-konforme Dokumentation",
];

const businessFeatures = [
  "800 Protokolle/Monat",
  "Alles aus Pro",
  "Persönlicher Onboarding-Support",
  "Dedizierter Ansprechpartner",
];

function PriceBlock({
  billing,
  bruttoMain,
  nettoAmountLabel,
  yearlyBruttoTotalDisplay,
  variant,
}: {
  billing: Billing;
  bruttoMain: string;
  nettoAmountLabel: string;
  /** Bruttobetrag für „= X / Jahr“ (nur bei billing === yearly) */
  yearlyBruttoTotalDisplay: string | null;
  variant: "light" | "dark";
}) {
  const mainCls =
    variant === "dark"
      ? "text-4xl font-bold tracking-tight text-white md:text-5xl"
      : "text-4xl font-bold tracking-tight text-slate-900 md:text-5xl";
  const unitCls =
    variant === "dark"
      ? "text-sm text-slate-300 md:text-base"
      : "text-sm text-slate-500 md:text-base";
  const nettoSmallCls =
    variant === "dark" ? "text-xs text-slate-300" : "text-xs text-slate-400";
  const yearHighlightCls =
    variant === "dark"
      ? "mt-1 text-base font-semibold text-slate-200"
      : "mt-1 text-base font-semibold text-slate-700";

  return (
    <div className="mt-4 shrink-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={mainCls}>{bruttoMain}</span>
        <span className={unitCls}>/ Monat</span>
      </div>
      {billing === "yearly" && yearlyBruttoTotalDisplay ? (
        <p className={yearHighlightCls}>= {yearlyBruttoTotalDisplay} / Jahr</p>
      ) : null}
      <p className={`mt-1 ${nettoSmallCls}`}>
        {nettoAmountLabel} netto zzgl. 19% MwSt.
      </p>
    </div>
  );
}

export function PricingSection() {
  const [billing, setBilling] = useState<Billing>("monthly");

  const pid = (plan: keyof typeof PRICE_IDS) =>
    billing === "monthly" ? PRICE_IDS[plan].monthly : PRICE_IDS[plan].yearly;

  const starterBruttoMain =
    billing === "monthly" ? "30,00 €" : "25,00 €";
  const starterNettoLabel =
    billing === "monthly" ? "25,21 €" : "252,10 €";
  const starterYearBruttoTotal =
    billing === "yearly" ? "300,00 €" : null;

  const proBruttoMain = billing === "monthly" ? "70,00 €" : "58,00 €";
  const proNettoLabel = billing === "monthly" ? "58,82 €" : "588,24 €";
  const proYearBruttoTotal = billing === "yearly" ? "700,00 €" : null;

  const businessBruttoMain =
    billing === "monthly" ? "175,00 €" : "146,00 €";
  const businessNettoLabel =
    billing === "monthly" ? "147,06 €" : "1.470,59 €";
  const businessYearBruttoTotal =
    billing === "yearly" ? "1.750,00 €" : null;

  return (
    <section
      id="pricing"
      className="scroll-mt-20 bg-white px-4 py-14 sm:py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <motion.header
          className="mx-auto max-w-2xl text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <p className="text-sm font-medium uppercase tracking-widest text-blue-600">
            Preise
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">
            Einfach. Fair. Transparent.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600 md:text-base">
            30 Tage kostenlos testen — keine Kreditkarte nötig.
          </p>
        </motion.header>

        <motion.div
          role="group"
          aria-label="Abrechnungszeitraum"
          className="mx-auto mt-10 flex w-full max-w-2xl justify-center sm:mt-12"
          variants={fadeUpDelay(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <div className="relative inline-flex min-h-[48px] w-full rounded-xl border border-slate-200 bg-slate-100 p-1 sm:min-w-[280px] sm:max-w-md">
            {billing === "monthly" ? (
              <div
                className="pointer-events-none absolute -top-3 left-[75%] z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-semibold text-white"
                aria-hidden
              >
                2 Monate gratis
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`min-h-[44px] flex-1 rounded-lg px-3 text-sm font-semibold transition sm:px-4 sm:text-base ${
                billing === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 active:bg-white/50 md:hover:text-slate-900"
              }`}
            >
              Monatlich
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={`min-h-[44px] flex-1 rounded-lg px-3 text-sm font-semibold transition sm:px-4 sm:text-base ${
                billing === "yearly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 active:bg-white/50 md:hover:text-slate-900"
              }`}
            >
              Jährlich
            </button>
          </div>
        </motion.div>

        <motion.div
          className="mx-auto mt-10 flex max-w-6xl flex-col gap-6 md:mt-12 md:grid md:grid-cols-3 md:items-end md:gap-6 lg:gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {/* Starter */}
          <motion.div
            variants={staggerItem}
            className="order-2 flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm transition-all ease-out sm:px-8 md:order-1 md:hover:-translate-y-1 md:hover:shadow-lg"
          >
            <div>
              <h3 className="text-xl font-bold text-slate-900">Starter</h3>
              <PriceBlock
                variant="light"
                billing={billing}
                bruttoMain={starterBruttoMain}
                nettoAmountLabel={starterNettoLabel}
                yearlyBruttoTotalDisplay={starterYearBruttoTotal}
              />
            </div>
            <ul className="flex-1 mt-6 space-y-3 text-sm text-slate-700 md:text-base">
              {starterFeatures.map((line) => (
                <li key={line} className="flex gap-3">
                  <Check
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-1">
              <Link
                href="/register"
                data-price-id={pid("starter")}
                className={`${ctaBtnTransform} inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 sm:text-base`}
              >
                30 Tage kostenlos starten
              </Link>
              <p className="text-center text-xs text-slate-500">
                Keine Kreditkarte nötig
              </p>
            </div>
          </motion.div>

          {/* Pro — mobile zuerst */}
          <motion.div
            variants={staggerItemPro}
            className="order-1 flex min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900 px-6 py-12 shadow-xl transition-all ease-out sm:px-8 md:order-2 md:z-10 md:hover:-translate-y-1 md:hover:shadow-2xl"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-bold text-white">Pro</h3>
                <span className="shrink-0 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  Beliebt
                </span>
              </div>
              <PriceBlock
                variant="dark"
                billing={billing}
                bruttoMain={proBruttoMain}
                nettoAmountLabel={proNettoLabel}
                yearlyBruttoTotalDisplay={proYearBruttoTotal}
              />
            </div>
            <ul className="flex-1 mt-6 space-y-3 text-sm text-slate-200 md:text-base">
              {proFeatures.map((line) => (
                <li key={line} className="flex gap-3">
                  <Check
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-1">
              <Link
                href="/register"
                data-price-id={pid("pro")}
                className={`${ctaBtnTransform} inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 sm:text-base`}
              >
                30 Tage kostenlos starten
              </Link>
              <p className="text-center text-xs text-slate-300">
                Keine Kreditkarte nötig
              </p>
            </div>
          </motion.div>

          {/* Business */}
          <motion.div
            variants={staggerItem}
            className="order-3 flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm transition-all ease-out sm:px-8 md:order-3 md:hover:-translate-y-1 md:hover:shadow-lg"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Neu
                </span>
                <h3 className="text-xl font-bold text-slate-900">Business</h3>
              </div>
              <PriceBlock
                variant="light"
                billing={billing}
                bruttoMain={businessBruttoMain}
                nettoAmountLabel={businessNettoLabel}
                yearlyBruttoTotalDisplay={businessYearBruttoTotal}
              />
            </div>
            <ul className="flex-1 mt-6 space-y-3 text-sm text-slate-700 md:text-base">
              {businessFeatures.map((line) => (
                <li key={line} className="flex gap-3">
                  <Check
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-1">
              <Link
                href="/register"
                data-price-id={pid("business")}
                className={`${ctaBtnTransform} inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 sm:text-base`}
              >
                30 Tage kostenlos starten
              </Link>
              <p className="text-center text-xs text-slate-500">
                Keine Kreditkarte nötig
              </p>
            </div>
          </motion.div>
        </motion.div>

        <motion.p
          className="mx-auto mt-10 max-w-xl text-center text-sm text-slate-500 md:mt-12"
          variants={fadeUpDelay(0.12)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          Ab 800+ Protokollen? Meld dich:{" "}
          <a
            href="mailto:kontakt@dokuhero.de"
            className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
          >
            kontakt@dokuhero.de
          </a>
        </motion.p>
      </div>
    </section>
  );
}
