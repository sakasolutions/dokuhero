import type { Pool } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { getBetriebPlanFromDb } from "@/lib/betrieb-plan";

/** Monatliches Protokoll-Limit für Plan „Starter“ (Fallback ohne DB-Spalte). */
export const STARTER_PROTOKOLL_MONATS_LIMIT = 50;

/** Fallback-Limits nur nach Plan (wenn `max_protokolle` in DB NULL). */
export function getProtokolLimit(plan: string): number {
  const p = (plan || "").trim().toLowerCase();
  switch (p) {
    case "starter":
      return 50;
    case "pro":
    case "business":
    case "trial":
      return 9999;
    default:
      return 50;
  }
}

export function resolveProtokollMonatsCap(
  plan: string,
  maxProtokolle: number | null | undefined
): { limit: number; unlimited: boolean } {
  if (maxProtokolle != null && Number.isFinite(Number(maxProtokolle))) {
    const n = Number(maxProtokolle);
    if (n >= 9999) return { limit: n, unlimited: true };
    return { limit: n, unlimited: false };
  }
  const lim = getProtokolLimit(plan);
  return { limit: lim, unlimited: lim >= 9999 };
}

interface PlanCapRow extends RowDataPacket {
  plan: string | null;
  max_protokolle: number | null;
}

/** Liest `plan` + `max_protokolle` aus `betriebe` (Migration `add_betrieb_max_limits.sql`). */
export async function fetchBetriebProtokollMonatsCap(
  pool: Pool,
  betriebId: number
): Promise<{ limit: number; unlimited: boolean }> {
  try {
    const [rows] = await pool.execute<PlanCapRow[]>(
      "SELECT plan, max_protokolle FROM betriebe WHERE id = ? LIMIT 1",
      [betriebId]
    );
    const row = rows[0];
    return resolveProtokollMonatsCap(
      typeof row?.plan === "string" ? row.plan : "",
      row?.max_protokolle
    );
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: string }).code)
        : "";
    if (code === "ER_BAD_FIELD_ERROR") {
      const plan = await getBetriebPlanFromDb(pool, betriebId);
      const lim = getProtokolLimit(plan);
      return { limit: lim, unlimited: lim >= 9999 };
    }
    throw e;
  }
}
