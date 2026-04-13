# DokuHero App

Next.js App: Baustellen, Berichte, Whisper, KI, PDF.

## Setup

1. MySQL-Datenbank anlegen, Migration `db/migrations/001_initial.sql` ausführen.
2. Nutzer mit bcrypt-Hash einfügen, z. B.:

```sql
INSERT INTO users (email, password_hash, name)
VALUES ('du@example.com', '$2b$10$6Kcj4PYG9VyOQexIJl4AB.2BW2xU24VbUMdmgHrKuTY9bBwIzDPUK', 'Name');
```

(Passwort obiger Hash: `test12345` — nur für Entwicklung.)

3. `.env.local` aus `.env.example` kopieren, Werte setzen.
4. `npm install` → `npm run dev`.

## Repo-Hinweis

Projekt liegt unter `dokuhero/dokuhero-app/` (eigenes `package.json`). Für ein **eigenes Git-Repo**: Ordner verschieben und `git init`.
