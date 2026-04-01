import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { sendBewertungsAnfrage } from "@/lib/bewertung";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface IdRow extends RowDataPacket {
  id: number;
}

function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET?.trim();
}

function getMinAgeMinutes(): number {
  const raw = process.env.BEWERTUNG_MIN_AGE_MINUTES?.trim();
  const n = raw ? Number(raw) : 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > 24 * 60) return 24 * 60;
  return Math.floor(n);
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

  const minutes = getMinAgeMinutes();
  const pool = getPool();

  const [rows] = await pool.execute<IdRow[]>(
    `SELECT p.id
     FROM protokolle p
     INNER JOIN auftraege a ON a.id = p.auftrag_id
     LEFT JOIN kunden k ON k.id = a.kunde_id
     LEFT JOIN bewertungen b ON b.protokoll_id = p.id
     WHERE p.gesendet_am IS NOT NULL
       AND p.gesendet_am < DATE_SUB(NOW(), INTERVAL ? MINUTE)
       AND b.id IS NULL
       AND k.email IS NOT NULL
       AND TRIM(k.email) <> ''`,
    [minutes]
  );

  let sent = 0;
  const errors: string[] = [];

  for (const r of rows) {
    try {
      const ok = await sendBewertungsAnfrage(r.id);
      if (ok) sent += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`protokoll ${r.id}: ${msg}`);
      console.error("Cron bewertung:", r.id, e);
    }
  }

  return NextResponse.json({
    sent,
    checked: rows.length,
    minutes,
    ...(errors.length ? { errors } : {}),
  });
}
