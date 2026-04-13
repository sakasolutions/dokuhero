import OpenAI from "openai";

const SYSTEM = `Du bist ein Assistent für Baustellen-Dokumentation in Deutschland.
Aus Stichpunkten eine strukturierte Leistungsliste erstellen:
- eine kurze Zeile pro Tätigkeit
- sachlich, keine Füllwörter, kein Fließtext
- keine Nummerierung, keine Bullet-Zeichen
- nur der Text, keine Erklärung`;

export async function polishRawNote(text: string): Promise<string> {
  const t = text.trim();
  if (!t) return t;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY fehlt.");
  const client = new OpenAI({ apiKey: key });
  const r = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content:
          "Korrigiere Stichpunkte einer Baustelle: Rechtschreibung, Grammatik, Inhalt gleich lassen, nur Text zurück.",
      },
      { role: "user", content: t },
    ],
  });
  return r.choices[0]?.message?.content?.trim() ?? t;
}

export async function formatBericht(notiz: string, baustelleName: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY fehlt.");
  const client = new OpenAI({ apiKey: key });
  const n = notiz.trim() || "(keine Notiz)";
  const r = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.35,
    max_tokens: 900,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Baustelle: ${baustelleName}\n\nStichpunkte:\n${n}` },
    ],
  });
  const out = r.choices[0]?.message?.content?.trim();
  if (!out) throw new Error("Leere KI-Antwort.");
  return out;
}
