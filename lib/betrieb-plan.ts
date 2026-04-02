import type { Pool } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

interface PlanRow extends RowDataPacket {
  plan: string | null;
}

/** Aktueller Plan aus der DB (JWT kann nach Upgrade/Stripe veraltet sein). */
export async function getBetriebPlanFromDb(
  pool: Pool,
  betriebId: number
): Promise<string> {
  const [rows] = await pool.execute<PlanRow[]>(
    "SELECT plan FROM betriebe WHERE id = ? LIMIT 1",
    [betriebId]
  );
  const raw = rows[0]?.plan;
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}
