import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI, { toFile } from "openai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const MAX = 25 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "OPENAI_API_KEY fehlt" }, { status: 500 });
    let fd: FormData;
    try {
      fd = await req.formData();
    } catch {
      return NextResponse.json({ error: "Bad form" }, { status: 400 });
    }
    const blob = fd.get("audio") ?? fd.get("file");
    if (!blob || !(blob instanceof Blob)) {
      return NextResponse.json({ error: "audio fehlt" }, { status: 400 });
    }
    if (blob.size === 0) return NextResponse.json({ error: "Leer" }, { status: 400 });
    if (blob.size > MAX) return NextResponse.json({ error: "Zu groß" }, { status: 400 });
    const buf = Buffer.from(await blob.arrayBuffer());
    const mime = blob.type || "audio/webm";
    const client = new OpenAI({ apiKey: key });
    const file = await toFile(buf, "rec.webm", { type: mime });
    const tr = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "de",
    });
    const roh = tr.text?.trim() ?? "";
    if (!roh) return NextResponse.json({ text: "" });
    const cl = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Bereinige Baustellen-Sprachnotiz: Füllwörter raus, Stichpunkte, Grammatik. Nur Text.",
        },
        { role: "user", content: roh },
      ],
    });
    const text = cl.choices[0]?.message?.content?.trim() ?? roh;
    return NextResponse.json({ text });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler" },
      { status: 500 }
    );
  }
}
