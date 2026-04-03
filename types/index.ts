export interface Betrieb {
  id: number;
  name: string;
  email: string;
  passwort: string;
  /** 1 = gesperrt (nur sinnvoll nach Migration gesperrt-Spalte) */
  gesperrt?: number;
  telefon: string | null;
  branche: string | null;
  adresse: string | null;
  logo_pfad: string | null;
  google_bewertung_link: string | null;
  erstellt_am: Date;
}

export interface Kunde {
  id: number;
  betrieb_id: number;
  name: string;
  email: string | null;
  telefon: string | null;
  adresse: string | null;
  fahrzeug: string | null;
  kennzeichen: string | null;
  notizen: string | null;
  erstellt_am: Date;
}

export type AuftragStatus = "offen" | "in_bearbeitung" | "abgeschlossen";

export type ProtokollStatus = "entwurf" | "zur_pruefung" | "freigegeben";

export interface Auftrag {
  id: number;
  betrieb_id: number;
  kunde_id: number | null;
  /** z. B. "DH-2026-00001" */
  auftragsnummer?: string | null;
  beschreibung?: string | null;
  status: string;
  erstellt_am: Date;
  abgeschlossen_am: Date | null;
  /** 1 = archiviert (nicht in Standardlisten) */
  archiviert?: number;
}

/** API-Liste GET /api/auftraege */
export interface AuftragMitKunde extends Auftrag {
  kunde_name: string | null;
  protokoll_id: number | null;
  /** Status des zuletzt verknüpften Protokolls (JOIN), falls vorhanden */
  protokoll_status?: string | null;
}

/** GET /api/auftraege/:id inkl. Protokoll-Liste */
export interface ProtokollListeEintrag {
  id: number;
  erstellt_am: string;
  gesendet_am: string | null;
  pdf_pfad: string | null;
  status?: ProtokollStatus | string | null;
  notiz?: string | null;
  protokoll_nummer?: number | null;
}

export interface AuftragMitProtokollen extends AuftragMitKunde {
  protokolle: ProtokollListeEintrag[];
}

export interface Protokoll {
  id: number;
  auftrag_id: number;
  /** Fortlaufend pro Auftrag (1, 2, …); optional bei Altbestand */
  protokoll_nummer?: number | null;
  notiz: string | null;
  ki_text: string | null;
  pdf_pfad: string | null;
  gesendet_am: Date | null;
  erstellt_am: Date;
  status: ProtokollStatus;
  /** 1 = archiviert */
  archiviert?: number;
}

export interface FotoEintrag {
  id: number;
  protokoll_id: number;
  datei_pfad: string;
  dateiname: string;
  erstellt_am: Date;
}

export interface DashboardStats {
  kundenGesamt: number;
  auftraegeHeute: number;
  protokolleDieseWoche: number;
  /** Protokolle im laufenden Kalendermonat (Betrieb) */
  protokolle_monat: number;
  /** Monatslimit (z. B. 50); null = unbegrenzt (Pro/Business/Trial o. ä.) */
  protokoll_limit: number | null;
  /** Protokolle mit Status zur_pruefung / Anzeige „Zur Freigabe bereit“ (Betrieb) */
  protokolle_zur_pruefung: number;
  offeneAuftraege: number;
  bewertungen_positiv: number;
  bewertungen_negativ: number;
  letztes_feedback: string | null;
}
