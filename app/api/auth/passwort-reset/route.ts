import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(1, "Token fehlt"),
  password: z.string().min(8, "Mindestens 8 Zeichen"),
});

interface ResetRow extends RowDataPacket {
  email: string;
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const first =
        Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .find((m) => typeof m === "string") ?? "Ungültige Eingaben.";
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const { token, password } = parsed.data;
    const pool = getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute<ResetRow[]>(
        `SELECT email FROM passwort_reset
         WHERE token = ? AND expires_at > NOW()
         LIMIT 1
         FOR UPDATE`,
        [token]
      );

      const row = rows[0];
      if (!row) {
        await conn.rollback();
        return NextResponse.json(
          { error: "Link ungültig oder abgelaufen. Bitte neu anfordern." },
          { status: 400 }
        );
      }

      const emailNorm = row.email.trim().toLowerCase();
      const hash = await bcrypt.hash(password, 12);

      const [updHeader] = await conn.execute<ResultSetHeader>(
        "UPDATE betriebe SET passwort = ? WHERE email = ?",
        [hash, emailNorm]
      );

      if (updHeader.affectedRows === 0) {
        await conn.rollback();
        return NextResponse.json(
          { error: "Konto nicht gefunden." },
          { status: 404 }
        );
      }

      await conn.execute("DELETE FROM passwort_reset WHERE email = ?", [
        emailNorm,
      ]);

      await conn.commit();
      return NextResponse.json({ success: true });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "";
    if (code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json(
        {
          error:
            "Passwort-Reset ist noch nicht eingerichtet (Migration passwort_reset.sql).",
        },
        { status: 500 }
      );
    }
    console.error("[passwort-reset]", e);
    return NextResponse.json(
      { error: "Zurücksetzen fehlgeschlagen." },
      { status: 500 }
    );
  }
}
