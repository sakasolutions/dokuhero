import type { Metadata } from "next";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const metadata: Metadata = {
  title: "Datenschutz | DokuHero",
  description: "Datenschutzerklärung der DokuHero-Software.",
};

export default function DatenschutzPage() {
  return (
    <LegalPageShell>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Datenschutzerklärung
      </h1>

      <h2>1. Verantwortlicher</h2>
      <p>
        SAKA Solutions – IT &amp; Webdesign
        <br />
        Sinan Sakacilar
        <br />
        Esslinger Str. 15, 89537 Giengen an der Brenz
        <br />
        <a
          href="mailto:kontakt@dokuhero.de"
          className="font-medium text-primary hover:underline"
        >
          kontakt@dokuhero.de
        </a>
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Kontaktdaten des Betriebs (Name, E-Mail, Telefon, Adresse)</li>
        <li>Kundendaten (Name, Fahrzeug, Kennzeichen, E-Mail, Telefon)</li>
        <li>Auftrags- und Protokolldaten inkl. Fotos</li>
        <li>
          Zahlungsdaten (verarbeitet durch Stripe, wir speichern keine
          Kartendaten)
        </li>
        <li>Technische Daten (IP-Adresse, Browser, Logs)</li>
      </ul>

      <h2>3. Zweck der Verarbeitung</h2>
      <ul>
        <li>
          Bereitstellung der DokuHero-Software (Protokollerstellung,
          PDF-Versand, Bewertungsautomatik)
        </li>
        <li>Abrechnung und Zahlungsabwicklung</li>
        <li>Kommunikation mit Nutzern</li>
      </ul>

      <h2>4. Aufbewahrungsdauer</h2>
      <p>
        Protokolle und Auftragsdaten werden gemäß gesetzlicher
        Aufbewahrungspflicht 10 Jahre gespeichert (§ 147 AO). Kontodaten werden
        nach Vertragsende 3 Jahre aufbewahrt.
      </p>

      <h2>5. Drittanbieter</h2>
      <ul>
        <li>
          Hetzner Online GmbH (Hosting, Server in Helsinki/Finnland) — AVV
          vorhanden
        </li>
        <li>
          OpenAI Ireland Ltd. (KI-Texterstellung — es werden nur Stichpunkte
          übermittelt, keine Personendaten) — Standardvertragsklauseln
        </li>
        <li>Resend Inc. (E-Mail-Versand) — AVV vorhanden</li>
        <li>
          Stripe Payments Europe Ltd. (Zahlungsabwicklung) — AVV vorhanden
        </li>
      </ul>

      <h2>6. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung,
        Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch.
        Kontakt:{" "}
        <a
          href="mailto:kontakt@dokuhero.de"
          className="font-medium text-primary hover:underline"
        >
          kontakt@dokuhero.de
        </a>
      </p>

      <h2>7. Beschwerderecht</h2>
      <p>
        Sie haben das Recht, sich bei einer Datenschutzbehörde zu beschweren.
        Zuständig: Der Landesbeauftragte für den Datenschutz und die
        Informationsfreiheit Baden-Württemberg.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Wir verwenden ausschließlich technisch notwendige Session-Cookies für
        die Anmeldung. Es werden keine Tracking- oder Werbe-Cookies eingesetzt.
      </p>

      <p className="mt-8 text-sm text-slate-500">Stand: April 2026</p>
    </LegalPageShell>
  );
}
