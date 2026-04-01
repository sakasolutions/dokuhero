-- Einmalig ausführen, falls Spalte noch fehlt:
ALTER TABLE betriebe
  ADD COLUMN adresse TEXT NULL AFTER telefon;
