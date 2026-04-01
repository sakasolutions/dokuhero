import { notFound, redirect } from "next/navigation";
import { NeinFeedbackForm } from "@/components/bewertung/NeinFeedbackForm";
import { getBewertungKontextByToken } from "@/lib/bewertung";
import { getPool } from "@/lib/db";

type Props = { params: { token: string; antwort: string } };

export default async function BewertungAntwortPage({ params }: Props) {
  const { token, antwort } = params;
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    notFound();
  }

  const a = antwort.toLowerCase();
  if (a !== "ja" && a !== "nein") {
    notFound();
  }

  let ctx = await getBewertungKontextByToken(token);
  if (!ctx) {
    notFound();
  }

  const pool = getPool();

  if (a === "ja") {
    if (ctx.zufrieden === 0) {
      return (
        <>
          <h1 className="text-xl font-bold text-slate-900">Hinweis</h1>
          <p className="mt-3 text-slate-600">
            Sie haben zuvor angegeben, dass es Probleme gab. Eine Google-Bewertung
            ist über diesen Link daher nicht vorgesehen.
          </p>
        </>
      );
    }

    if (ctx.zufrieden === null) {
      await pool.execute(
        `UPDATE bewertungen SET zufrieden = 1 WHERE id = ? AND zufrieden IS NULL`,
        [ctx.bewertung_id]
      );
      ctx = (await getBewertungKontextByToken(token)) ?? ctx;
    }

    const link = ctx.google_bewertung_link?.trim();
    if (link && /^https?:\/\//i.test(link)) {
      redirect(link);
    }

    return (
      <>
        <h1 className="text-xl font-bold text-slate-900">Vielen Dank!</h1>
        <p className="mt-3 text-slate-600">
          Schön, dass Sie zufrieden waren. Für eine öffentliche Bewertung bei
          Google ist bei diesem Betrieb derzeit kein Link hinterlegt.
        </p>
      </>
    );
  }

  /* nein */
  if (ctx.zufrieden === 1) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900">Vielen Dank</h1>
        <p className="mt-3 text-slate-600">
          Sie haben bereits positiv geantwortet. Bei neuen Anliegen wenden Sie
          sich bitte direkt an den Betrieb.
        </p>
      </>
    );
  }

  if (ctx.zufrieden === null) {
    await pool.execute(
      `UPDATE bewertungen SET zufrieden = 0 WHERE id = ? AND zufrieden IS NULL`,
      [ctx.bewertung_id]
    );
    ctx = (await getBewertungKontextByToken(token)) ?? ctx;
  }

  if (ctx.feedback_text?.trim()) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900">Vielen Dank</h1>
        <p className="mt-3 text-slate-600">
          Ihr Feedback haben wir erhalten. Der Betrieb wurde informiert.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900">Es tut uns leid</h1>
      <p className="mt-3 text-slate-600">
        Dass etwas nicht passte, nehmen wir ernst. Bitte schildern Sie kurz, was
        wir verbessern können – Ihr Betrieb erhält diese Nachricht direkt.
      </p>
      <NeinFeedbackForm token={token} />
    </>
  );
}
