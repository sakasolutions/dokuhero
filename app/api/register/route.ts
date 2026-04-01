import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPool } from "@/lib/db";
import type { ResultSetHeader } from "mysql2";

const registerSchema = z
  .object({
    name: z.string().min(1, "Betriebsname ist erforderlich"),
    email: z.string().email("Ungültige E-Mail"),
    password: z.string().min(8, "Mindestens 8 Zeichen"),
    passwordConfirm: z.string(),
    telefon: z.string().optional().nullable(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, telefon } = parsed.data;
    const pool = getPool();
    const hash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO betriebe (name, email, passwort, telefon, adresse, google_maps_link)
       VALUES (?, ?, ?, ?, NULL, NULL)`,
      [name.trim(), email.trim().toLowerCase(), hash, telefon?.trim() || null]
    );

    return NextResponse.json({
      ok: true,
      betriebId: result.insertId,
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Diese E-Mail ist bereits registriert." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Registrierung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
