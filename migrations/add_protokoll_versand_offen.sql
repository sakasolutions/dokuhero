-- Versand noch durch Büro / Nachbearbeitung vorgemerkt (Werker-Option „Büro kümmert sich“)
-- TINYINT(1) NOT NULL DEFAULT 0 = false; idempotent (mehrfach ausführbar)

SET @db := DATABASE();
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'protokolle'
    AND COLUMN_NAME = 'versand_offen'
);
SET @q := IF(
  @exists = 0,
  'ALTER TABLE protokolle ADD COLUMN versand_offen TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
