CREATE TABLE IF NOT EXISTS benutzer (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  betrieb_id    INT NOT NULL,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NULL,
  username      VARCHAR(100) NULL,
  passwort      VARCHAR(255) NOT NULL,
  rolle         ENUM('inhaber','mitarbeiter') NOT NULL DEFAULT 'mitarbeiter',
  aktiv         TINYINT(1) NOT NULL DEFAULT 1,
  erstellt_am   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_email (email),
  UNIQUE KEY unique_username_per_betrieb (betrieb_id, username),
  FOREIGN KEY (betrieb_id) REFERENCES betriebe(id) ON DELETE CASCADE
);
