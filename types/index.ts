export interface Betrieb {
  id: number;
  name: string;
  email: string;
  passwort_hash: string;
  telefon: string | null;
  adresse: string | null;
  google_maps_link: string | null;
  created_at: Date;
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
  created_at: Date;
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
