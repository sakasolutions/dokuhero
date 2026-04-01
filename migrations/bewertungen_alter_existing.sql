-- Falls die Tabelle `bewertungen` bereits existiert und nur Spalten fehlen:

ALTER TABLE bewertungen ADD COLUMN protokoll_id INT NULL;
ALTER TABLE bewertungen ADD COLUMN token VARCHAR(64) NULL;
ALTER TABLE bewertungen ADD UNIQUE KEY uq_bewertungen_token (token);
ALTER TABLE bewertungen ADD COLUMN zufrieden TINYINT(1) NULL;
ALTER TABLE bewertungen ADD COLUMN feedback_text TEXT NULL;
ALTER TABLE bewertungen ADD COLUMN erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Hinweis: Einzelne ALTERs schlagen fehl, wenn die Spalte schon existiert – dann überspringen.
