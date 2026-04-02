import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { PreiseClient } from "./PreiseClient";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Row extends RowDataPacket {
  plan: string | null;
  erstellt_am: Date | null;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export default async function PreisePage() {
  const session = await getServerSession(authOptions);
  const betriebId = session?.user?.betrieb_id;
  if (!betriebId) {
    // Dashboard-Layout redirected bereits, aber als Fallback:
    return null;
  }

  const pool = getPool();
  const [rows] = await pool.execute<Row[]>(
    `SELECT plan, erstellt_am FROM betriebe WHERE id = ? LIMIT 1`,
    [betriebId]
  );
  const row = rows[0];
  const currentPlan = row?.plan ?? "trial";

  let trialDaysLeft: number | null = null;
  if (currentPlan === "trial" && row?.erstellt_am instanceof Date) {
    const ms = Date.now() - row.erstellt_am.getTime();
    const days = ms / (24 * 60 * 60 * 1000);
    trialDaysLeft = clampInt(30 - days, 0, 30);
  }

  return <PreiseClient currentPlan={currentPlan} trialDaysLeft={trialDaysLeft} />;
}

