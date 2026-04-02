import type { Metadata } from "next";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const metadata: Metadata = {
  title: "AGB | DokuHero",
  description: "Allgemeine Geschäftsbedingungen für DokuHero.",
};

export default function AgbPage() {
  return (
    <LegalPageShell>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Allgemeine Geschäftsbedingungen
      </h1>

      <p className="mt-2 text-sm text-slate-600">
        SAKA Solutions – DokuHero
        <br />
        Stand: April 2026
      </p>

      <h2>1. Geltungsbereich</h2>
      <p>
        Diese AGB gelten für die Nutzung der SaaS-Plattform DokuHero
        (dokuhero.de), betrieben von SAKA Solutions, Sinan Sakacilar,
        Esslinger Str. 15, 89537 Giengen an der Brenz.
      </p>

      <h2>2. Vertragsabschluss</h2>
      <p>
        Der Vertrag kommt durch Registrierung und Buchung eines Abonnements
        zustande.
      </p>

      <h2>3. Leistungen</h2>
      <p>
        DokuHero stellt eine webbasierte Software zur Erstellung von
        Serviceprotokollen, PDF-Generierung und Bewertungsautomatik bereit.
        Die Verfügbarkeit wird mit 99&nbsp;% angestrebt, kann jedoch nicht
        garantiert werden.
      </p>

      <h2>4. Abonnement &amp; Preise</h2>
      <ul>
        <li>Starter: 29&nbsp;€ netto/Monat (bis 50 Protokolle)</li>
        <li>Pro: 59&nbsp;€ netto/Monat (unbegrenzte Protokolle)</li>
        <li>Jährliche Zahlung mit 2 Monaten Rabatt möglich</li>
        <li>Preise zzgl. gesetzlicher MwSt.</li>
        <li>Zahlung über Stripe (Kreditkarte)</li>
      </ul>

      <h2>5. Testphase</h2>
      <p>
        Neue Accounts erhalten 30 Tage kostenlosen Testzugang mit vollem
        Funktionsumfang. Keine Kreditkarte für die Testphase erforderlich.
      </p>

      <h2>6. Kündigung</h2>
      <p>
        Monatliche Abonnements können jederzeit zum Ende des Abrechnungszeitraums
        gekündigt werden. Die Kündigung erfolgt über{" "}
        <a
          href="mailto:kontakt@dokuhero.de"
          className="font-medium text-primary hover:underline"
        >
          kontakt@dokuhero.de
        </a>{" "}
        oder das Kundenportal.
      </p>

      <h2>7. Datenspeicherung</h2>
      <p>
        Protokolle werden gemäß gesetzlicher Aufbewahrungspflicht 10 Jahre
        gespeichert. Nach Vertragsende werden Betriebsdaten nach 90 Tagen
        gelöscht, Protokolle entsprechend der gesetzlichen Frist aufbewahrt.
      </p>

      <h2>8. Haftung</h2>
      <p>
        SAKA Solutions haftet nicht für Datenverlust bei höherer Gewalt.
        Regelmäßige Backups werden durchgeführt. Die Haftung ist auf den Betrag
        des jeweiligen Monatsabonnements begrenzt.
      </p>

      <h2>9. Änderungen</h2>
      <p>
        Änderungen der AGB werden 30 Tage vor Inkrafttreten per E-Mail
        angekündigt.
      </p>

      <h2>10. Anwendbares Recht</h2>
      <p>
        Es gilt deutsches Recht. Gerichtsstand ist Giengen an der Brenz.
      </p>
    </LegalPageShell>
  );
}
