import OpenAI from "openai";

const SYSTEM = `Du bist ein Assistent für Baustellen-Dokumentation in Deutschland.
Erstelle aus den Stichpunkten eine strukturierte Leistungsliste.

Regeln:
- Jede Tätigkeit = eine eigene Zeile
- Kurzer, präziser Satz (max. eine Zeile)
- Sachlich, keine Füllwörter, kein Fließtext
- Keine Nummerierung, keine Bullet-Points (•/-/*)
- Gib NUR die Liste zurück, keine Erklärungen`;

export async function formatRawNote(rohtext: string): Promise<string> {
  if (!rohtext.trim()) return rohtext;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY ist nicht gesetzt.");
  const client = new OpenAI({ apiKey: key });
  const r = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 300,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `Du korrigierst Stichpunkte von der Baustelle: Rechtschreibung, Grammatik, Inhalt unverändert, eine Stichpunkt-Zeile pro Zeile, nur der Text als Antwort.`,
      },
      { role: "user", content: rohtext.trim() },
    ],
  });
  return r.choices[0]?.message?.content?.trim() ?? rohtext;
}

export async function generateBerichtText(
  notiz: string,
  baustelleName: string
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY ist nicht gesetzt.");
  const client = new OpenAI({ apiKey: key });
  const stichpunkte = notiz.trim() || "(keine Stichpunkte)";
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Baustelle: ${baustelleName}\n\nStichpunkte:\n${stichpunkte}`,
      },
    ],
    max_tokens: 800,
    temperature: 0.4,
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Keine KI-Antwort.");
  return text;
}
