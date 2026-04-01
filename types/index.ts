export interface Betrieb {
  id: number;
  name: string;
  email: string;
  passwort: string;
  telefon: string | null;
  logo_pfad: string | null;
  google_bewertung_link: string | null;
  erstellt_am: Date;
}

export interface Kunde {
  id: number;
  betrieb_id: number;
  name: string;
  telefon: string | null;
  email: string | null;
  fahrzeug: string | null;
  kennzeichen: string | null;
  notizen: string | null;
  erstellt_am: Date;
}

export interface Auftrag {
  id: number;
  betrieb_id: number;
  kunde_id: number | null;
  beschreibung: string | null;
  status: string;
  erstellt_am: Date;
  abgeschlossen_am: Date | null;
}

export interface DashboardStats {
  kundenGesamt: number;
  auftraegeHeute: number;
  protokolleDieseWoche: number;
  offeneAuftraege: number;
}
