"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";

type BetriebApi = {
  id: number;
  name: string;
  email: string;
  telefon: string | null;
  adresse: string | null;
  logo_pfad: string | null;
  google_bewertung_link: string | null;
};

const formSchema = z
  .object({
    name: z.string().min(1, "Betriebsname ist erforderlich"),
    telefon: z.string().optional(),
    adresse: z.string().optional(),
    google_bewertung_link: z.string().optional(),
    neuesPasswort: z.string().optional(),
    neuesPasswortBestaetigung: z.string().optional(),
  })
  .refine((d) => !d.neuesPasswort?.trim() || d.neuesPasswort.length >= 8, {
    message: "Neues Passwort: mindestens 8 Zeichen.",
    path: ["neuesPasswort"],
  })
  .refine(
    (d) =>
      !d.neuesPasswort?.trim() ||
      d.neuesPasswort === (d.neuesPasswortBestaetigung ?? ""),
    {
      message: "Passwort-Bestätigung stimmt nicht überein.",
      path: ["neuesPasswortBestaetigung"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

function fileToJpegDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxW = 800;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas nicht verfügbar."));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht geladen werden."));
    };
    img.src = url;
  });
}

export default function EinstellungenPage() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailReadonly, setEmailReadonly] = useState("");
  const [logoPfad, setLogoPfad] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMsg, setLogoMsg] = useState<string | null>(null);
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      telefon: "",
      adresse: "",
      google_bewertung_link: "",
      neuesPasswort: "",
      neuesPasswortBestaetigung: "",
    },
  });

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/einstellungen");
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoadError(
        typeof j.error === "string" ? j.error : "Laden fehlgeschlagen."
      );
      return;
    }
    const b = j.betrieb as BetriebApi;
    setEmailReadonly(b.email);
    setLogoPfad(b.logo_pfad);
    reset({
      name: b.name,
      telefon: b.telefon ?? "",
      adresse: b.adresse ?? "",
      google_bewertung_link: b.google_bewertung_link ?? "",
      neuesPasswort: "",
      neuesPasswortBestaetigung: "",
    });
  }, [reset]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      setLogoErr("Bitte eine Bilddatei wählen.");
      return;
    }
    setLogoErr(null);
    setLogoMsg(null);
    setLogoUploading(true);
    try {
      const dataUrl = await fileToJpegDataUrl(file);
      const res = await fetch("/api/einstellungen/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64: dataUrl }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLogoErr(
          typeof j.error === "string" ? j.error : "Upload fehlgeschlagen."
        );
        return;
      }
      if (typeof j.logo_pfad === "string") {
        setLogoPfad(`${j.logo_pfad}?t=${Date.now()}`);
      }
      setLogoMsg("Logo wurde gespeichert.");
    } catch (err) {
      setLogoErr(
        err instanceof Error ? err.message : "Upload fehlgeschlagen."
      );
    } finally {
      setLogoUploading(false);
    }
  }

  async function onSubmit(data: FormValues) {
    setFormError(null);
    setFormOk(null);
    const body: Record<string, unknown> = {
      name: data.name.trim(),
      telefon: data.telefon?.trim() || null,
      adresse: data.adresse?.trim() || null,
      google_bewertung_link: data.google_bewertung_link?.trim() || null,
    };
    if (data.neuesPasswort?.trim()) {
      body.neuesPasswort = data.neuesPasswort;
      body.neuesPasswortBestaetigung = data.neuesPasswortBestaetigung;
    }
    const res = await fetch("/api/einstellungen", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFormError(typeof j.error === "string" ? j.error : "Speichern fehlgeschlagen.");
      return;
    }
    reset({
      ...data,
      neuesPasswort: "",
      neuesPasswortBestaetigung: "",
    });
    setFormOk("Änderungen wurden gespeichert.");
    await load();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <p className="text-slate-600">Laden…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <p className="text-red-600">{loadError}</p>
        <Link href="/dashboard" className="text-primary hover:underline">
          Zum Dashboard
        </Link>
      </div>
    );
  }

  const logoSrc =
    logoPfad && !logoPfad.includes("?")
      ? `${logoPfad}?v=1`
      : logoPfad ?? null;

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Einstellungen</h1>
        <p className="text-slate-600">Betriebsdaten und Logo für DokuHero</p>
      </div>

      {formError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError}
        </p>
      ) : null}
      {formOk ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {formOk}
        </p>
      ) : null}

      <Card>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <Input
            label="Betriebsname"
            {...register("name")}
            error={errors.name?.message}
          />

          <Input
            label="E-Mail"
            type="email"
            value={emailReadonly}
            readOnly
            className="cursor-not-allowed bg-slate-50 text-slate-600"
          />

          <Input label="Telefon" type="tel" {...register("telefon")} />

          <Textarea label="Adresse" rows={3} {...register("adresse")} />

          <div>
            <Input
              label="Google-Bewertungslink"
              type="url"
              placeholder="https://..."
              {...register("google_bewertung_link")}
              error={errors.google_bewertung_link?.message}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Den Link findest du in Google Maps bei deinem Betrieb → Teilen.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <p className="text-sm font-medium text-slate-700">Logo</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Wird als JPG gespeichert (max. ca. 800 px Breite). Speicherort auf
              dem Server:{" "}
              <code className="rounded bg-slate-100 px-1 text-[11px]">
                …/uploads/logos/{"{betrieb_id}"}.jpg
              </code>
            </p>
            {logoSrc ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="max-h-20 max-w-full object-contain"
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Noch kein Logo.</p>
            )}
            {logoErr ? (
              <p className="mt-2 text-sm text-red-600">{logoErr}</p>
            ) : null}
            {logoMsg ? (
              <p className="mt-2 text-sm text-emerald-800">{logoMsg}</p>
            ) : null}
            <div className="mt-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50">
                {logoUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Logo hochladen
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={logoUploading}
                  onChange={(ev) => void onLogoFile(ev)}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <p className="text-sm font-medium text-slate-700">
              Passwort ändern
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Optional – nur ausfüllen, wenn du das Passwort ändern möchtest.
            </p>
            <div className="mt-3 space-y-4">
              <Input
                label="Neues Passwort"
                type="password"
                autoComplete="new-password"
                {...register("neuesPasswort")}
                error={errors.neuesPasswort?.message}
              />
              <Input
                label="Neues Passwort bestätigen"
                type="password"
                autoComplete="new-password"
                {...register("neuesPasswortBestaetigung")}
                error={errors.neuesPasswortBestaetigung?.message}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="min-h-12 w-full gap-2 sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Speichern…
              </>
            ) : (
              "Speichern"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
