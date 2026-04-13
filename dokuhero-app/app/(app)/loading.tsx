export default function AppLoading() {
  return (
    <div className="space-y-4 py-2" aria-busy="true" aria-label="Laden">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
      <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}
