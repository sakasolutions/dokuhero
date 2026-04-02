/** Monatliches Protokoll-Limit für Plan „Starter“. In Development niedriger zum Testen. */
export const STARTER_PROTOKOLL_MONATS_LIMIT =
  process.env.NODE_ENV === "development" ? 6 : 50;
