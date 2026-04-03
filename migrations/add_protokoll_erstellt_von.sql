-- Werker: „Meine Protokolle“ nach Ersteller filtern
ALTER TABLE protokolle
  ADD COLUMN erstellt_von_benutzer_id INT UNSIGNED NULL AFTER archiviert;
