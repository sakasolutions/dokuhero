import type { ProtokollStatus } from "@/types";

export function protokollStatusLabel(s: ProtokollStatus | string): string {
  switch (s) {
    case "entwurf":
      return "In Bearbeitung";
    case "zur_pruefung":
      return "Zur Freigabe bereit";
    case "freigegeben":
      return "Freigegeben";
    default:
      return String(s);
  }
}
