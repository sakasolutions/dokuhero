import type { Metadata } from "next";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const metadata: Metadata = {
  title: "Impressum | DokuHero",
  description: "Impressum und Anbieterkennzeichnung DokuHero.",
};

export default function ImpressumPage() {
  return (
    <LegalPageShell>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Impressum
      </h1>

      <p className="mt-2 text-sm text-slate-600">
        Angaben gemäß § 5 TMG
      </p>

      <p className="mt-6 font-medium text-slate-900">
        SAKA Solutions – IT &amp; Webdesign
        <br />
        Inhaber: Sinan Sakacilar
        <br />
        Esslinger Str. 15
        <br />
        89537 Giengen an der Brenz
        <br />
        Deutschland
      </p>

      <p className="mt-4">
        Telefon:{" "}
        <a
          href="tel:+4915226396063"
          className="font-medium text-primary hover:underline"
        >
          +49 1522 6396063
        </a>
        <br />
        E-Mail:{" "}
        <a
          href="mailto:kontakt@dokuhero.de"
          className="font-medium text-primary hover:underline"
        >
          kontakt@dokuhero.de
        </a>
      </p>

      <h2>Umsatzsteuer-ID</h2>
      <p>DE456172594</p>

      <h2>Verantwortlich i. S. d. § 18 Abs. 2 MStV</h2>
      <p>
        Sinan Sakacilar, Esslinger Str. 15, 89537 Giengen an der Brenz
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir für eigene Inhalte nach den allgemeinen
        Gesetzen verantwortlich.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unsere Seiten enthalten Links zu externen Websites. Für diese Inhalte
        ist stets der jeweilige Anbieter verantwortlich.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Alle Inhalte dieser Website unterliegen dem deutschen Urheberrecht.
      </p>

      <h2>Online-Streitbeilegung</h2>
      <p>
        Wir sind nicht verpflichtet und nicht bereit, an
        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>
    </LegalPageShell>
  );
}
