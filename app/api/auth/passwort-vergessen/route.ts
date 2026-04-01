import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { sendPasswortResetMail } from "@/lib/mail";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email("Ungültige E-Mail"),
});

interface IdRow extends RowDataPacket {
  id: number;
}

function getAppBaseUrl(): string {
  const u =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "https://dokuhero.de";
  return u.replace(/\/$/, "");
}

export async function POST(request: Request) {
  const genericOk = NextResponse.json({
    ok: true,
    message:
      "Wenn ein Konto mit dieser E-Mail existiert, erhältst du gleich einen Link.",
  });

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bitte eine gültige E-Mail eingeben." },
        { status: 400 }
      );
    }

    const emailNorm = parsed.data.email.trim().toLowerCase();
    const pool = getPool();

    const [rows] = await pool.execute<IdRow[]>(
      "SELECT id FROM betriebe WHERE email = ? LIMIT 1",
      [emailNorm]
    );

    if (rows.length === 0) {
      return genericOk;
    }

    const token = randomBytes(32).toString("hex");

    await pool.execute("DELETE FROM passwort_reset WHERE email = ?", [
      emailNorm,
    ]);
    await pool.execute(
      `INSERT INTO passwort_reset (email, token, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
      [emailNorm, token]
    );

    const base = getAppBaseUrl();
    const resetUrl = `${base}/passwort-reset/${token}`;

    try {
      await sendPasswortResetMail(emailNorm, resetUrl);
    } catch (e) {
      console.error("[passwort-vergessen] Mail:", e);
      await pool.execute("DELETE FROM passwort_reset WHERE email = ?", [
        emailNorm,
      ]);
    }

    return genericOk;
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code: string }).code)
        : "";
    if (code === "ER_NO_SUCH_TABLE") {
      console.error("[passwort-vergessen] Tabelle passwort_reset fehlt.");
      return NextResponse.json(
        {
          error:
            "Passwort-Reset ist noch nicht eingerichtet (Migration passwort_reset.sql).",
        },
        { status: 500 }
      );
    }
    console.error("[passwort-vergessen]", e);
    return NextResponse.json(
      { error: "Anfrage konnte nicht verarbeitet werden." },
      { status: 500 }
    );
  }
}
