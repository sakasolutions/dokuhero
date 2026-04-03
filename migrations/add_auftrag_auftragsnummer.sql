-- Fortlaufende Auftragsnummer pro Betrieb (Anzeige z. B. #0001)
ALTER TABLE auftraege
  ADD COLUMN auftragsnummer VARCHAR(32) NULL AFTER kunde_id;
