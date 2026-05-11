export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface/40">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>
          SRM Placement Intelligence · Decision-grade structured data · Source of Truth · Read-only
          reference.
        </span>
        <span className="font-mono">v1.0 · enterprise-pwa</span>
      </div>
    </footer>
  );
}
