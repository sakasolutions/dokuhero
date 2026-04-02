-- Strukturierte Adressfelder für betriebe (Freitext-Spalte adresse bleibt als Fallback).
ALTER TABLE betriebe
  ADD COLUMN strasse VARCHAR(255) DEFAULT NULL,
  ADD COLUMN plz VARCHAR(10) DEFAULT NULL,
  ADD COLUMN ort VARCHAR(100) DEFAULT NULL;
