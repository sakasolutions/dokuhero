# DokuHero Werkzeug

Neue schlanke App: Baustellen, Berichte, Sprache, KI-Formulierung, PDF.

## Voraussetzungen

- Node 18+
- MySQL 8+
- OpenAI API Key

## Einrichtung

1. Datenbank anlegen, z. B. `CREATE DATABASE dokuhero_tool CHARACTER SET utf8mb4;`
2. Migration ausführen: `db/migrations/001_initial.sql` gegen diese Datenbank.
3. Ersten Nutzer anlegen (Passwort-Hash für `test12345` – in Produktion eigenes Passwort setzen):

```sql
INSERT INTO users (email, password_hash, name)
VALUES (
  'dev@local.test',
  '$2b$10$6Kcj4PYG9VyOQexIJl4AB.2BW2xU24VbUMdmgHrKuTY9bBwIzDPUK',
  'Dev'
);
```

4. `.env.local` aus `.env.example` kopieren und Werte setzen.
5. `npm install` und `npm run dev`.

Login: `dev@local.test` / `test12345` (nur für lokale Entwicklung gedacht).

## Struktur

- `app/(app)/` – geschützte MVP-Seiten
- `app/(auth)/login` – Anmeldung
- `app/api/` – REST-Endpunkte
- `lib/` – DB, Auth, AI, PDF, Uploads
- `db/migrations/` – SQL

## PDF / Puppeteer

Lokal nutzt Puppeteer das mitgelieferte Chromium. Auf Linux-Servern ggf. `PUPPETEER_EXECUTABLE_PATH` setzen.
