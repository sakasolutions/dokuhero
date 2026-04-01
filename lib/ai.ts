import OpenAI from "openai";

const SYSTEM_PROMPT =
  "Du bist ein professioneller Assistent für Handwerksbetriebe. " +
  "Erstelle aus den Stichpunkten einen professionellen, höflichen Protokolltext " +
  "auf Deutsch. Max 3 Absätze. Kein Kundenname, keine persönlichen Daten.";

export async function generateProtokollText(
  notiz: string,
  _betriebName: string
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY ist nicht gesetzt.");
  }

  const client = new OpenAI({ apiKey: key });
  const stichpunkte = notiz.trim() || "(keine Stichpunkte)";

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Stichpunkte des Monteurs: ${stichpunkte}`,
      },
    ],
    max_tokens: 800,
    temperature: 0.4,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Keine Antwort von der KI.");
  }
  return text;
}
