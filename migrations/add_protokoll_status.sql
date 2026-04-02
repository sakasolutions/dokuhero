-- Freigabe-Workflow: Protokoll-Status
ALTER TABLE protokolle
  ADD COLUMN status ENUM('entwurf', 'zur_pruefung', 'freigegeben')
  NOT NULL DEFAULT 'entwurf';

-- Bereits versendete Protokolle als freigegeben markieren
UPDATE protokolle SET status = 'freigegeben' WHERE gesendet_am IS NOT NULL;

-- Optional: laufende Entwürfe mit KI-Text als „zur Prüfung“ (nach Bedarf ausführen)
-- UPDATE protokolle SET status = 'zur_pruefung'
-- WHERE gesendet_am IS NULL AND ki_text IS NOT NULL AND TRIM(ki_text) <> '' AND status = 'entwurf';
