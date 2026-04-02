-- Archiv für Aufträge und Protokolle
ALTER TABLE protokolle ADD COLUMN archiviert tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE auftraege ADD COLUMN archiviert tinyint(1) NOT NULL DEFAULT 0;
