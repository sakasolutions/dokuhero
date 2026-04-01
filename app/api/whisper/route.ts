import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI, { toFile } from "openai";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024; // Whisper-Limit grob

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.betrieb_id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY ist nicht gesetzt." },
        { status: 500 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Ungültige FormData" }, { status: 400 });
    }

    const entry = formData.get("audio") ?? formData.get("file");
    if (!entry || !(entry instanceof Blob)) {
      return NextResponse.json(
        { error: "Audio-Datei fehlt (Feld „audio“)." },
        { status: 400 }
      );
    }

    if (entry.size === 0) {
      return NextResponse.json({ error: "Leere Aufnahme." }, { status: 400 });
    }
    if (entry.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Aufnahme zu groß (max. ca. 25 MB)." },
        { status: 400 }
      );
    }

    const ab = await entry.arrayBuffer();
    const buffer = Buffer.from(ab);
    const mime = entry.type || "audio/webm";
    const ext =
      mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")
        ? "m4a"
        : mime.includes("webm")
          ? "webm"
          : "webm";

    const openai = new OpenAI({ apiKey: key });
    const file = await toFile(buffer, `recording.${ext}`, { type: mime });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "de",
    });

    const text = transcription.text?.trim() ?? "";
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[whisper]", error);
    const msg =
      error instanceof Error ? error.message : "Transkription fehlgeschlagen.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
