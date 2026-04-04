import {
  protokollStatusLabel,
  protokollStatusLabelWerker,
} from "@/lib/protokoll-status-label";

export function ProtokollStatusBadge({
  status,
  werkerLabels,
}: {
  status: string | null | undefined;
  werkerLabels?: boolean;
}) {
  if (status == null || status === "") return null;
  const styles: Record<string, string> = {
    entwurf: "bg-slate-100 text-slate-800",
    zur_pruefung: "bg-amber-100 text-amber-800",
    freigegeben: "bg-green-100 text-green-800",
  };
  const cls = styles[status] ?? "bg-slate-100 text-slate-700";
  const label = werkerLabels
    ? protokollStatusLabelWerker(status)
    : protokollStatusLabel(status);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
