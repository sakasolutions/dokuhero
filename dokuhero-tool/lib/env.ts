/**
 * Zentrale Prüfung kritischer Umgebungsvariablen (fail fast beim Start relevanter Routen).
 */
export function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`${name} ist nicht gesetzt.`);
  }
  return v;
}

export function getDatabaseUrlParts(): {
  host: string;
  user: string;
  password: string;
  database: string;
} {
  const host = requireEnv("DB_HOST");
  const user = requireEnv("DB_USER");
  const password = process.env.DB_PASSWORD ?? "";
  const database = requireEnv("DB_NAME");
  return { host, user, password, database };
}
