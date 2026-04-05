import OpenAI from "openai";

const SYSTEM_PROMPT = `Du bist ein Assistent für Handwerksbetriebe in Deutschland.
Erstelle aus den Stichpunkten eine strukturierte Leistungsliste.

Regeln:
- Jede Tätigkeit = eine eigene Zeile
- Format: kurzer, präziser Satz (max. 1 Zeile)
- Fachlich korrekt, keine Füllwörter
- Kein Fließtext, keine langen Absätze
- Kein "Im Rahmen der...", kein "Es wurde festgestellt dass..."
- Direkt und sachlich: "Ölwechsel durchgeführt" statt 
  "Im Rahmen der Wartung wurde ein Ölwechsel vorgenommen"
- Materialien wenn vorhanden am Ende als eigene Zeile
- Keine Nummerierung, keine Bullet-Points (•/-/*)
- Kein Marketing, keine Dankesfloskeln
- Gib NUR die Leistungsliste zurück, keine Erklärungen`;

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

const REFINE_SYSTEM_PROMPT = `Du bist ein Assistent für Handwerksbetriebe in Deutschland.
Der Nutzer liefert eine bestehende Leistungsliste und eine kurze Stilanweisung (z. B. kürzer, formeller, einfacher).
Passe NUR den Stil an die Anweisung an — Inhalt und Fakten unverändert lassen, nichts erfinden.

Format-Regeln (gleich wie bei der Erst-Erstellung):
- Jede Tätigkeit = eine eigene Zeile
- Kurze, präzise Sätze (max. 1 Zeile pro Punkt)
- Kein Fließtext, keine langen Absätze
- Kein "Im Rahmen der...", kein "Es wurde festgestellt dass..."
- Direkt und sachlich
- Materialien falls vorhanden am Ende als eigene Zeile
- Keine Nummerierung, keine Bullet-Points (•/-/*)
- Kein Marketing, keine Dankesfloskeln
- Keine neuen persönlichen Daten oder Kundennamen erfinden
- Gib NUR die überarbeitete Leistungsliste zurück, keine Erklärungen`;

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
