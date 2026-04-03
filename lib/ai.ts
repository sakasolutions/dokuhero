import OpenAI from "openai";

const SYSTEM_PROMPT =
  "Du bist ein professioneller Assistent für Handwerksbetriebe. " +
  "Erstelle aus den Stichpunkten einen professionellen, höflichen Protokolltext " +
  "auf Deutsch. Max 3 Absätze. Kein Kundenname, keine persönlichen Daten.";

export async function generateProtokollText(
  notiz: string,
  _betriebName: string,
  materialien?: string | null
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY ist nicht gesetzt.");
  }

  const client = new OpenAI({ apiKey: key });
  const stichpunkte = notiz.trim() || "(keine Stichpunkte)";
  const mat = materialien?.trim();
  const userContent =
    mat != null && mat !== ""
      ? `Stichpunkte des Monteurs: ${stichpunkte}\n\nVerwendete Materialien: ${mat}`
      : `Stichpunkte des Monteurs: ${stichpunkte}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: userContent,
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

const FORMATIERE_NOTIZ_SYSTEM = `Du bist ein Assistent für Handwerksbetriebe in Deutschland.
Du bekommst rohe Stichpunkte von Monteuren — oft mit Tippfehlern, 
Rechtschreibfehlern, Dialekt oder gebrochenem Deutsch.

Deine Aufgabe:
- Korrigiere alle Rechtschreib- und Tippfehler
- Korrigiere Grammatik und Groß/Kleinschreibung
- Erkenne was gemeint ist und schreibe es korrekt auf Deutsch
- Behalte den Inhalt exakt bei — nichts hinzufügen oder weglassen
- Jeder Stichpunkt bleibt eine eigene Zeile
- Kein ausformulierter Fließtext — nur saubere Stichpunkte
- Gib NUR den korrigierten Text zurück, keine Erklärungen`;

export async function formatiereNotiz(rohtext: string): Promise<string> {
  if (!rohtext.trim()) return rohtext;

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY ist nicht gesetzt.");
  }

  const client = new OpenAI({ apiKey: key });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 300,
    temperature: 0.2,
    messages: [
      { role: "system", content: FORMATIERE_NOTIZ_SYSTEM },
      { role: "user", content: rohtext.trim() },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? rohtext;
}

const REFINE_SYSTEM_PROMPT =
  "Du bist ein Assistent für Handwerksbetriebe. Der folgende Text ist ein Servicereport- bzw. Protokollentwurf. " +
  "Passe ihn präzise an die Anweisung des Nutzers an. Bleibe professionell und höflich auf Deutsch, höchstens drei Absätze. " +
  "Erfinde keine neuen persönlichen Daten oder Kundennamen. Gib ausschließlich den überarbeiteten Protokolltext zurück, ohne Einleitung oder Erklärung.";

export async function refineProtokollText(
  previousText: string,
  feedback: string
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY ist nicht gesetzt.");
  }

  const client = new OpenAI({ apiKey: key });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: REFINE_SYSTEM_PROMPT },
      { role: "assistant", content: previousText.trim() || "–" },
      { role: "user", content: feedback.trim() },
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
