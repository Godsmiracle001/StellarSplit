export type RoutePendingProps = {
  title?: string;
  testId?: string;
};

export default function RoutePending({
  title = "Loading…",
  testId = "route-pending",
}: RoutePendingProps) {
  return (
    <section
      className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-4xl items-center justify-center p-6 sm:p-8"
      aria-busy="true"
      role="status"
      data-testid={testId}
    >
      <div className="w-full rounded-3xl border border-theme bg-card-theme p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Loading
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-theme">{title}</h1>
        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-muted-theme/20">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-accent/70" />
        </div>
      </div>
    </section>
  );
}

