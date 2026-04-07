-- Zuletzt gespeicherter Wizard-Schritt (1–8); NULL = Altbestand, Resume nutzt Fallback-Heuristik
SET @db := DATABASE();
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'protokolle'
    AND COLUMN_NAME = 'current_step'
);
SET @q := IF(
  @exists = 0,
  'ALTER TABLE protokolle ADD COLUMN current_step TINYINT UNSIGNED NULL DEFAULT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
