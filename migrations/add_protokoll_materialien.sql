-- Freitext: verwendete Materialien / Positionen (optional)
ALTER TABLE protokolle
  ADD COLUMN materialien TEXT NULL AFTER notiz;
