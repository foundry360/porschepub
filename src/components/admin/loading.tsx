export function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-4">
      <span className="sr-only">Loading…</span>
      <div className="h-10 w-64 bg-paper-deep" />
      <div className="h-4 w-96 max-w-full bg-paper-deep" />
      <div className="h-64 bg-paper-deep" />
    </div>
  );
}
