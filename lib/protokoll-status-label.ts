import type { ProtokollStatus } from "@/types";

export function protokollStatusLabel(s: ProtokollStatus | string): string {
  switch (s) {
    case "entwurf":
      return "In Bearbeitung";
    case "zur_pruefung":
      return "Zur Freigabe bereit";
    case "freigegeben":
      return "Abgeschlossen";
    default:
      return String(s);
  }
}

export function protokollStatusLabelWerker(s: string): string {
  if (s === "entwurf") return "In Bearbeitung";
  if (s === "freigegeben") return "Abgeschlossen";
  return protokollStatusLabel(s);
}
