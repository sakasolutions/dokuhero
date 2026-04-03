-- Auftragsnummer pro Betrieb (z. B. DH-2026-00001)
ALTER TABLE auftraege
  ADD COLUMN auftragsnummer VARCHAR(32) NULL AFTER kunde_id;
