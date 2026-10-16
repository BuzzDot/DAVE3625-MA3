export default function Loading() {
  return (
    <div role="status" className="space-y-5 py-5">
      <p className="text-sm text-muted-foreground">Getting your space ready…</p>
      <div className="h-64 rounded-2xl bg-secondary" />
      <div className="grid grid-cols-2 gap-5">
        <div className="h-40 rounded-2xl border border-border bg-white" />
        <div className="h-40 rounded-2xl border border-border bg-white" />
      </div>
    </div>
  );
}
