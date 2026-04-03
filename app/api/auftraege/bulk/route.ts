import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  ids: z
    .array(z.coerce.number().int().positive())
    .min(1, "Mindestens eine ID")
    .max(500, "Maximal 500 IDs"),
  action: z.literal("archivieren"),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    if (session.user.rolle !== "inhaber") {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const betriebId = session.user.betrieb_id;
    const ids = [...new Set(parsed.data.ids)];

    const pool = getPool();
    const placeholders = ids.map(() => "?").join(",");

    const [found] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM auftraege WHERE betrieb_id = ? AND id IN (${placeholders})`,
      [betriebId, ...ids]
    );

    if (found.length !== ids.length) {
      return NextResponse.json(
        { error: "Mindestens eine ID gehört nicht zu deinem Betrieb." },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE auftraege SET archiviert = 1
       WHERE betrieb_id = ? AND archiviert = 0 AND id IN (${placeholders})`,
      [betriebId, ...ids]
    );

    return NextResponse.json({
      ok: true,
      archiviert: result.affectedRows ?? 0,
    });
  } catch (error) {
    console.error("[auftraege/bulk]", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
