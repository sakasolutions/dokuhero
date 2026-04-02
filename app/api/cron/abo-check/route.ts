import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";
import { sendAboAbgelaufenMail } from "@/lib/mail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface BetriebRow extends RowDataPacket {
  id: number;
  email: string;
}

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

  const pool = getPool();

  const [rows] = await pool.execute<BetriebRow[]>(
    `SELECT id, email
     FROM betriebe
     WHERE plan IN ('starter', 'pro')
       AND abo_bis IS NOT NULL
       AND abo_bis < NOW()
       AND email IS NOT NULL
       AND TRIM(email) <> ''`
  );

  if (rows.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");

  await pool.execute(
    `UPDATE betriebe
     SET plan = 'expired'
     WHERE id IN (${placeholders})`,
    ids as unknown as any[]
  );

  let mailed = 0;
  const errors: string[] = [];
  for (const r of rows) {
    try {
      await sendAboAbgelaufenMail(r.email);
      mailed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`betrieb ${r.id}: ${msg}`);
      console.error("Cron abo-check mail:", r.id, e);
    }
  }

  return NextResponse.json({
    expired: rows.length,
    mailed,
    ...(errors.length ? { errors } : {}),
  });
}

