/**
 * Auto-Archivierung abgeschlossener Aufträge (älter als 90 Tage).
 *
 * Crontab (Serverzeit 04:00), z. B.:
 *   0 4 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" \
 *     https://dokuhero.de/api/cron/auto-archiv >> /var/log/dokuhero-cron-archiv.log 2>&1
 *
 * Token: denselben Wert wie CRON_SECRET in .env (nicht hardcoden).
 */
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import type { ResultSetHeader } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET?.trim();
}

export async function GET(request: Request) {
  const secret = getCronSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET ist nicht konfiguriert." },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE auftraege
       SET archiviert = 1
       WHERE status = 'abgeschlossen'
         AND abgeschlossen_am IS NOT NULL
         AND abgeschlossen_am < DATE_SUB(NOW(), INTERVAL 90 DAY)
         AND archiviert = 0`
    );

    const archiviert = result.affectedRows ?? 0;
    return NextResponse.json({ archiviert });
  } catch (error) {
    console.error("[cron/auto-archiv]", error);
    return NextResponse.json(
      { error: "Auto-Archivierung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
