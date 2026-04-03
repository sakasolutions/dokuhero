-- Laufende Protokoll-Nummer je Auftrag (1, 2, 3, …)
ALTER TABLE protokolle
  ADD COLUMN protokoll_nummer INT UNSIGNED NULL AFTER auftrag_id;
