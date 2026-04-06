"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const BRANCHEN = [
  "KFZ-Werkstatt",
  "Hausmeisterdienst",
  "Handwerker",
  "Reinigung",
  "Sonstiges",
] as const;

const BASE_TABS = ["Betrieb", "Marke", "Abo", "Sicherheit"] as const;
type TabId = (typeof BASE_TABS)[number] | "Team";

type BenutzerRow = {
  id: number;
  name: string;
  email: string | null;
  username: string | null;
  rolle: string;
  aktiv: number;
  erstellt_am: string;
};

type BetriebApi = {
  id: number;
  name: string;
  email: string;
  telefon: string | null;
  branche: string | null;
  adresse: string | null;
  plz: string | null;
  stadt: string | null;
  logo_pfad: string | null;
  google_bewertung_link: string | null;
  plan: string | null;
  abo_bis: string | null;
  erstellt_am: string | null;
};

const TRIAL_MS = 30 * 24 * 60 * 60 * 1000;

function planLabelFromApi(plan: string | null): string {
  const p = (plan ?? "").trim().toLowerCase();
  if (p === "starter") return "Starter";
  if (p === "pro") return "Pro";
  if (p === "business") return "Business";
  if (p === "trial") return "Trial";
  if (p === "expired") return "Abgelaufen";
  if (!p) return "Trial";
  return (plan ?? "").trim();
}

function formatDeDatum(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const formSchema = z
  .object({
    name: z.string().min(1, "Betriebsname ist erforderlich"),
    telefon: z.string().nullable().optional(),
    branche: z.string().nullable().optional(),
    adresse: z.string().nullable().optional(),
    plz: z.string().nullable().optional(),
    stadt: z.string().nullable().optional(),
    google_bewertung_link: z.string().nullable().optional(),
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
  const [rolle, setRolle] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setRolle(data.rolle ?? null));
  }, []);

  const isInhaber = rolle === "inhaber";

  const tabs = useMemo((): TabId[] => {
    if (isInhaber) return [...BASE_TABS, "Team"];
    return [...BASE_TABS];
  }, [isInhaber]);

  const [activeTab, setActiveTab] = useState<TabId>("Betrieb");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailReadonly, setEmailReadonly] = useState("");
  const [betriebId, setBetriebId] = useState<number | null>(null);
  const [hasLogo, setHasLogo] = useState(false);
  const [logoCacheBust, setLogoCacheBust] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMsg, setLogoMsg] = useState<string | null>(null);
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [aboPlan, setAboPlan] = useState<string | null>(null);
  const [aboBisIso, setAboBisIso] = useState<string | null>(null);
  const [erstelltAmIso, setErstelltAmIso] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalErr, setPortalErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [benutzer, setBenutzer] = useState<BenutzerRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [teamFormData, setTeamFormData] = useState({
    name: "",
    username: "",
    passwort: "",
  });
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null);
  const [teamRowBusy, setTeamRowBusy] = useState<number | null>(null);

  const {
    register,
    reset,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      telefon: "",
      branche: "",
      adresse: "",
      plz: "",
      stadt: "",
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
    setBetriebId(b.id);
    setHasLogo(Boolean(b.logo_pfad?.trim()));
    setAboPlan(typeof b.plan === "string" ? b.plan : null);
    setAboBisIso(typeof b.abo_bis === "string" ? b.abo_bis : null);
    setErstelltAmIso(typeof b.erstellt_am === "string" ? b.erstellt_am : null);
    reset({
      name: b.name,
      telefon: b.telefon ?? "",
      branche: b.branche ?? "",
      adresse: b.adresse ?? "",
      plz: b.plz ?? "",
      stadt: b.stadt ?? "",
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

  useEffect(() => {
    if (activeTab !== "Team") return;
    if (rolle === null) return;
    if (rolle !== "inhaber") {
      setActiveTab("Betrieb");
    }
  }, [activeTab, rolle]);

  const loadBenutzer = useCallback(async () => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const res = await fetch("/api/benutzer");
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTeamError(
          typeof j.error === "string" ? j.error : "Team konnte nicht geladen werden."
        );
        return;
      }
      setBenutzer(Array.isArray(j) ? (j as BenutzerRow[]) : []);
    } catch {
      setTeamError("Netzwerkfehler.");
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "Team" && isInhaber) {
      void loadBenutzer();
    }
  }, [activeTab, isInhaber, loadBenutzer]);

  const aboAnzeige = useMemo(() => {
    const planKey = (aboPlan ?? "").trim().toLowerCase();
    const planText = planLabelFromApi(aboPlan);
    let endIso = aboBisIso;
    if (!endIso && planKey === "trial" && erstelltAmIso) {
      const start = new Date(erstelltAmIso).getTime();
      if (Number.isFinite(start)) {
        endIso = new Date(start + TRIAL_MS).toISOString();
      }
    }
    const datum = formatDeDatum(endIso);
    const datumZeile =
      planKey === "trial"
        ? datum
          ? { prefix: "Trial läuft ab:", text: datum }
          : null
        : datum
          ? { prefix: "Aktiv bis:", text: datum }
          : null;
    return { planText, datumZeile };
  }, [aboPlan, aboBisIso, erstelltAmIso]);

  const planKeyNorm = (aboPlan ?? "").trim().toLowerCase();
  const showAboPortalBtn =
    planKeyNorm === "starter" ||
    planKeyNorm === "pro" ||
    planKeyNorm === "business";

  async function openStripePortal() {
    setPortalErr(null);
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPortalErr(
          typeof j.error === "string"
            ? j.error
            : "Kundenportal konnte nicht geöffnet werden."
        );
        return;
      }
      if (typeof j.url === "string" && j.url) {
        window.location.href = j.url;
        return;
      }
      setPortalErr("Keine Weiterleitungs-URL erhalten.");
    } catch {
      setPortalErr("Netzwerkfehler.");
    } finally {
      setPortalLoading(false);
    }
  }

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
      if (j.ok) {
        setHasLogo(true);
        setLogoCacheBust((n) => n + 1);
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

  /** PUT /api/einstellungen — gleiche Payload-Logik wie zuvor */
  async function putEinstellungen(
    data: FormValues,
    mode: "stammdaten" | "passwort"
  ) {
    setFormError(null);
    if (mode === "passwort") {
      if (!data.neuesPasswort?.trim()) {
        setFormError("Bitte gib ein neues Passwort ein.");
        return;
      }
    }

    const body: Record<string, unknown> = {
      name: data.name.trim(),
      telefon: data.telefon?.trim() || null,
      branche: data.branche?.trim() || null,
      adresse: data.adresse?.trim() || null,
      plz: data.plz?.trim() || null,
      stadt: data.stadt?.trim() || null,
      google_bewertung_link: data.google_bewertung_link?.trim() || null,
    };
    if (mode === "passwort" && data.neuesPasswort?.trim()) {
      body.neuesPasswort = data.neuesPasswort;
      body.neuesPasswortBestaetigung = data.neuesPasswortBestaetigung;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/einstellungen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(
          typeof j.error === "string" ? j.error : "Speichern fehlgeschlagen."
        );
        return;
      }
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  async function saveBetriebTab() {
    const ok = await trigger([
      "name",
      "telefon",
      "branche",
      "adresse",
      "plz",
      "stadt",
      "google_bewertung_link",
    ]);
    if (!ok) return;
    await putEinstellungen(getValues(), "stammdaten");
  }

  async function saveMarkeTab() {
    const ok = await trigger([
      "name",
      "telefon",
      "branche",
      "adresse",
      "plz",
      "stadt",
      "google_bewertung_link",
    ]);
    if (!ok) return;
    await putEinstellungen(getValues(), "stammdaten");
  }

  async function saveSicherheitTab() {
    const ok = await trigger([
      "name",
      "neuesPasswort",
      "neuesPasswortBestaetigung",
    ]);
    if (!ok) return;
    await putEinstellungen(getValues(), "passwort");
  }

  async function submitTeamMitarbeiter() {
    setTeamError(null);
    setTeamSuccess(null);
    setTeamLoading(true);
    try {
      const res = await fetch("/api/benutzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamFormData.name.trim(),
          username: teamFormData.username.trim(),
          passwort: teamFormData.passwort,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTeamError(
          typeof j.error === "string" ? j.error : "Anlegen fehlgeschlagen."
        );
        return;
      }
      setTeamFormData({ name: "", username: "", passwort: "" });
      setShowForm(false);
      setTeamSuccess("Mitarbeiter wurde angelegt.");
      await loadBenutzer();
    } catch {
      setTeamError("Netzwerkfehler.");
    } finally {
      setTeamLoading(false);
    }
  }

  async function patchBenutzerAktiv(id: number, aktiv: boolean) {
    setTeamError(null);
    setTeamSuccess(null);
    setTeamRowBusy(id);
    try {
      const res = await fetch(`/api/benutzer/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktiv }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTeamError(
          typeof j.error === "string" ? j.error : "Aktualisierung fehlgeschlagen."
        );
        return;
      }
      await loadBenutzer();
    } catch {
      setTeamError("Netzwerkfehler.");
    } finally {
      setTeamRowBusy(null);
    }
  }

  async function deleteBenutzer(id: number) {
    if (!window.confirm("Mitarbeiter wirklich löschen?")) return;
    setTeamError(null);
    setTeamSuccess(null);
    setTeamRowBusy(id);
    try {
      const res = await fetch(`/api/benutzer/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTeamError(
          typeof j.error === "string" ? j.error : "Löschen fehlgeschlagen."
        );
        return;
      }
      setTeamSuccess("Mitarbeiter wurde entfernt.");
      await loadBenutzer();
    } catch {
      setTeamError("Netzwerkfehler.");
    } finally {
      setTeamRowBusy(null);
    }
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
        <Link href="/dashboard" className="text-primary hover:text-primary/80 hover:underline">
          Zum Dashboard
        </Link>
      </div>
    );
  }

  const logoPreviewSrc =
    betriebId != null && hasLogo
      ? `/uploads/logos/${betriebId}.jpg?v=${logoCacheBust}`
      : null;

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Einstellungen</h1>
        <p className="text-slate-600">Betriebsdaten und Logo für DokuHero</p>
      </div>

      <div className="-mx-1 mb-8 overflow-x-auto whitespace-nowrap border-b border-slate-200">
        <div className="flex min-w-0 gap-1 px-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={
                activeTab === tab
                  ? "-mb-px border-b-2 border-blue-600 px-4 py-2.5 text-sm font-medium text-blue-600"
                  : "px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              }
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {formError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {formError}
        </p>
      ) : null}

      {activeTab === "Betrieb" ? (
        <Card>
          <div className="space-y-5">
            <Input
              label="Betriebsname"
              {...register("name")}
              error={errors.name?.message}
            />

            <div>
              <Input
                label="E-Mail"
                type="email"
                value={emailReadonly}
                readOnly
                disabled
                className="cursor-not-allowed bg-slate-50 text-slate-600"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                E-Mail kann nicht geändert werden.
              </p>
            </div>

            <Input
              label="Telefon"
              type="tel"
              {...register("telefon")}
              value={watch("telefon") ?? ""}
            />

            <div>
              <label
                htmlFor="einstellungen-branche"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Branche
              </label>
              <select
                id="einstellungen-branche"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                {...register("branche")}
                value={watch("branche") ?? ""}
              >
                <option value="">Keine Angabe</option>
                {BRANCHEN.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Straße & Hausnummer"
              autoComplete="street-address"
              {...register("adresse")}
              value={watch("adresse") ?? ""}
            />

            <div className="flex flex-row gap-3">
              <div className="w-1/3 min-w-0 shrink-0">
                <Input
                  label="PLZ"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  {...register("plz")}
                  value={watch("plz") ?? ""}
                />
              </div>
              <div className="w-2/3 min-w-0">
                <Input
                  label="Stadt"
                  autoComplete="address-level2"
                  {...register("stadt")}
                  value={watch("stadt") ?? ""}
                />
              </div>
            </div>

            <Button
              type="button"
              className="min-h-12 w-full gap-2 sm:w-auto"
              disabled={saving}
              onClick={() => void saveBetriebTab()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Speichern…
                </>
              ) : (
                "Änderungen speichern"
              )}
            </Button>
          </div>
        </Card>
      ) : null}

      {activeTab === "Marke" ? (
        <Card>
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-slate-700">Logo</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Wird als JPG gespeichert (max. ca. 800 px Breite). Speicherort
                auf dem Server:{" "}
                <code className="rounded bg-slate-100 px-1 text-[11px]">
                  …/uploads/logos/{"{betrieb_id}"}.jpg
                </code>
              </p>
              {logoPreviewSrc ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreviewSrc}
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
                <p className="mt-2 text-sm text-primary">{logoMsg}</p>
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
              <p className="mt-2 text-xs text-slate-500">
                Dein Logo erscheint auf allen Protokoll-PDFs.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <Input
                label="Google-Bewertungslink"
                type="url"
                placeholder="https://..."
                {...register("google_bewertung_link")}
                value={watch("google_bewertung_link") ?? ""}
                error={errors.google_bewertung_link?.message}
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Den Link findest du in Google Maps bei deinem Betrieb → Teilen.
              </p>
              <p className="mt-1.5 text-xs text-slate-500">
                Zufriedene Kunden werden nach dem Einsatz automatisch auf diese
                Seite weitergeleitet.
              </p>
              <Button
                type="button"
                className="mt-4 min-h-12 w-full gap-2 sm:w-auto"
                disabled={saving}
                onClick={() => void saveMarkeTab()}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Speichern…
                  </>
                ) : (
                  "Änderungen speichern"
                )}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {activeTab === "Abo" ? (
        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">
                  Dein Plan:{" "}
                  <span className="font-semibold text-slate-900">
                    {aboAnzeige.planText}
                  </span>
                </p>
                {aboAnzeige.datumZeile ? (
                  <p className="text-sm text-slate-600">
                    {aboAnzeige.datumZeile.prefix}{" "}
                    <span className="font-medium text-slate-900">
                      {aboAnzeige.datumZeile.text}
                    </span>
                  </p>
                ) : null}
              </div>
              <Link
                href="/preise"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Plan upgraden
              </Link>
            </div>
          </Card>

          {showAboPortalBtn ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full gap-2 sm:w-auto"
                disabled={portalLoading}
                onClick={() => void openStripePortal()}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : null}
                Abo verwalten / Kündigen
              </Button>
              {portalErr ? (
                <p className="text-sm text-red-600">{portalErr}</p>
              ) : null}
              <p className="text-xs text-slate-500">
                Hier kannst du dein Abo kündigen oder deine Zahlungsmethode
                ändern.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "Sicherheit" ? (
        <Card>
          <div className="space-y-5">
            <p className="text-xs text-slate-500">
              Lass die Felder leer, wenn du dein Passwort nicht ändern möchtest
              — dann nicht auf „Passwort ändern“ klicken.
            </p>
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
            <Button
              type="button"
              className="min-h-12 w-full gap-2 sm:w-auto"
              disabled={saving}
              onClick={() => void saveSicherheitTab()}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Speichern…
                </>
              ) : (
                "Passwort ändern"
              )}
            </Button>
          </div>
        </Card>
      ) : null}

      {activeTab === "Team" && isInhaber ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Team verwalten
              </h2>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Mitarbeiter können Protokolle anlegen und den Protokolltext
                erstellen.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 shrink-0 self-start"
              onClick={() => {
                setShowForm((v) => !v);
                setTeamError(null);
                setTeamSuccess(null);
              }}
            >
              {showForm ? "Formular schließen" : "Mitarbeiter hinzufügen"}
            </Button>
          </div>

          {teamSuccess ? (
            <p
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
              role="status"
            >
              {teamSuccess}
            </p>
          ) : null}
          {teamError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {teamError}
            </p>
          ) : null}

          {showForm ? (
            <Card>
              <div className="space-y-4">
                <Input
                  label="Name"
                  value={teamFormData.name}
                  onChange={(e) =>
                    setTeamFormData((d) => ({ ...d, name: e.target.value }))
                  }
                  autoComplete="name"
                />
                <div>
                  <Input
                    label="Username"
                    value={teamFormData.username}
                    onChange={(e) =>
                      setTeamFormData((d) => ({
                        ...d,
                        username: e.target.value,
                      }))
                    }
                    autoComplete="username"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Wird zum Einloggen verwendet, z.B. max.mueller (klein
                    schreiben).
                  </p>
                </div>
                <Input
                  label="Passwort"
                  type="password"
                  value={teamFormData.passwort}
                  onChange={(e) =>
                    setTeamFormData((d) => ({ ...d, passwort: e.target.value }))
                  }
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  className="min-h-12 gap-2"
                  disabled={teamLoading}
                  onClick={() => void submitTeamMitarbeiter()}
                >
                  {teamLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Wird angelegt…
                    </>
                  ) : (
                    "Anlegen"
                  )}
                </Button>
              </div>
            </Card>
          ) : null}

          {teamLoading && !showForm && benutzer.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Team wird geladen…
            </p>
          ) : null}

          <div className="space-y-3">
            {benutzer.map((u) => {
              const isInhaberRow = u.rolle === "inhaber";
              const isAktiv = Number(u.aktiv) === 1;
              const loginHint =
                u.username?.trim() || u.email?.trim() || "–";
              return (
                <Card key={u.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {u.name}
                        <span className="font-normal text-slate-500">
                          {" "}
                          · {loginHint}
                        </span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={
                            isInhaberRow
                              ? "inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                              : "inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                          }
                        >
                          {isInhaberRow ? "Inhaber" : "Mitarbeiter"}
                        </span>
                        <span
                          className={
                            isAktiv
                              ? "inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
                              : "inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
                          }
                        >
                          {isAktiv ? "Aktiv" : "Inaktiv"}
                        </span>
                      </div>
                    </div>
                    {!isInhaberRow ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-10 text-sm"
                          disabled={teamRowBusy === u.id || teamLoading}
                          onClick={() =>
                            void patchBenutzerAktiv(u.id, !isAktiv)
                          }
                        >
                          {teamRowBusy === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isAktiv ? (
                            "Deaktivieren"
                          ) : (
                            "Aktivieren"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-10 border-red-200 text-sm text-red-700 hover:border-red-300 hover:bg-red-50"
                          disabled={teamRowBusy === u.id || teamLoading}
                          onClick={() => void deleteBenutzer(u.id)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Löschen
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
