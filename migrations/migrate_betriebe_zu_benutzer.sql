-- Jeden bestehenden Betrieb als ersten Inhaber 
-- in benutzer Tabelle eintragen
INSERT INTO benutzer (betrieb_id, name, email, passwort, rolle, aktiv, erstellt_am)
SELECT 
  id AS betrieb_id,
  name,
  email,
  passwort,
  'inhaber' AS rolle,
  IFNULL(gesperrt = 0, 1) AS aktiv,
  erstellt_am
FROM betriebe
WHERE id NOT IN (
  SELECT betrieb_id FROM benutzer WHERE rolle = 'inhaber'
);
