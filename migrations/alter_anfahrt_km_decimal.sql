-- km mit Dezimalstellen (z. B. 12,5)
ALTER TABLE protokolle
  MODIFY COLUMN anfahrt_km DECIMAL(10,2) NULL DEFAULT NULL;
