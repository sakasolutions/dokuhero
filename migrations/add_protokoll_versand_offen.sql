-- Versand noch durch Büro / Nachbearbeitung vorgemerkt (Werker-Option „Büro kümmert sich“)
ALTER TABLE protokolle
  ADD COLUMN versand_offen TINYINT(1) NOT NULL DEFAULT 0;
