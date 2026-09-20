/** Shown while the client form hydrates; `useSearchParams` needs the boundary. */
export function FormFallback() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-9 w-40 rounded-md bg-surface-muted" />
      <div className="h-12 w-full rounded-md bg-surface-muted" />
      <div className="h-20 w-full rounded-md bg-surface-muted" />
      <div className="h-12 w-full rounded-md bg-surface-muted" />
    </div>
  );
}
