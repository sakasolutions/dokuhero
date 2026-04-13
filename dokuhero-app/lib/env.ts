export function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} ist nicht gesetzt.`);
  return v;
}

export function getDbConfig() {
  return {
    host: requireEnv("DB_HOST"),
    user: requireEnv("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: requireEnv("DB_NAME"),
  };
}
