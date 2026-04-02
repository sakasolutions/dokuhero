-- Optionale Spalten für Plan-Limits (Webhook setzt sie bei Checkout).
ALTER TABLE betriebe
  ADD COLUMN max_protokolle INT UNSIGNED NULL DEFAULT NULL
    COMMENT 'NULL = Fallback über Plan; >=9999 = unbegrenzt' AFTER plan,
  ADD COLUMN max_benutzer INT UNSIGNED NULL DEFAULT NULL AFTER max_protokolle;
