import mysql from "mysql2/promise";
import { getDatabaseUrlParts } from "@/lib/env";

const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

function createPool(): mysql.Pool {
  const { host, user, password, database } = getDatabaseUrlParts();
  return mysql.createPool({
    host,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
  });
}

export function getPool(): mysql.Pool {
  if (!globalForDb.pool) {
    globalForDb.pool = createPool();
  }
  return globalForDb.pool;
}
