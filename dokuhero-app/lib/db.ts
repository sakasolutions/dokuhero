import mysql from "mysql2/promise";
import { getDbConfig } from "@/lib/env";

const g = globalThis as unknown as { pool: mysql.Pool | undefined };

export function getPool(): mysql.Pool {
  if (!g.pool) {
    const c = getDbConfig();
    g.pool = mysql.createPool({
      host: c.host,
      user: c.user,
      password: c.password,
      database: c.database,
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
    });
  }
  return g.pool;
}
