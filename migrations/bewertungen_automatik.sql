-- Bewertungs-Automatik (Zufriedenheits-Mail nach Protokollversand)
-- Falls Tabelle bereits existiert, stattdessen die ALTERs aus der Doku ausführen.

CREATE TABLE IF NOT EXISTS bewertungen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  protokoll_id INT NULL,
  token VARCHAR(64) NULL,
  zufrieden TINYINT(1) NULL COMMENT '1=Ja, 0=Nein, NULL=noch keine Antwort',
  feedback_text TEXT NULL,
  erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bewertungen_token (token),
  KEY idx_bewertungen_protokoll (protokoll_id)
);

-- Optional: Fremdschlüssel (nur wenn protokolle.id existiert)
-- ALTER TABLE bewertungen ADD CONSTRAINT fk_bewertungen_protokoll FOREIGN KEY (protokoll_id) REFERENCES protokolle(id) ON DELETE SET NULL;
