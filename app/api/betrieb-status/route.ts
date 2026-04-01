import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

interface Row extends RowDataPacket {
  gesperrt: number;
}

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ gesperrt: false });
    }

    const token = await getToken({ req, secret });
    const betriebId = token?.betrieb_id as number | undefined;
    if (!betriebId) {
      return NextResponse.json({ gesperrt: false });
    }

    const pool = getPool();
    const [rows] = await pool.execute<Row[]>(
      "SELECT gesperrt FROM betriebe WHERE id = ? LIMIT 1",
      [betriebId]
    );
    const g = rows[0]?.gesperrt;
    return NextResponse.json({ gesperrt: Number(g) === 1 });
  } catch (e) {
    console.error("[betrieb-status]", e);
    return NextResponse.json({ gesperrt: false });
  }
}
