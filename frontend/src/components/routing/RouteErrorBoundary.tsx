import {
  Link,
  isRouteErrorResponse,
  useLocation,
  useRouteError,
} from "react-router-dom";

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (typeof error.data === "string" && error.data.trim()) return error.data;
    if (typeof error.statusText === "string" && error.statusText.trim())
      return error.statusText;
    return `Request failed (${error.status})`;
  }

  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong while loading the current screen.";
}

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const { pathname } = useLocation();
  const message = getErrorMessage(error);

  return (
    <section
      className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-4xl items-center justify-center p-6 sm:p-8"
      role="alert"
      aria-live="polite"
      data-testid="route-error-boundary"
    >
      <div className="w-full rounded-3xl border border-theme bg-card-theme p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Page Error
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-theme">
          We could not render this page
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-theme">
          {message}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={pathname}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Try Again
          </a>
          <Link
            to="/dashboard"
            className="rounded-full border border-theme px-4 py-2 text-sm font-semibold text-theme"
          >
            Open Dashboard
          </Link>
          <Link
            to="/"
            className="rounded-full border border-theme px-4 py-2 text-sm font-semibold text-theme"
          >
            Go Home
          </Link>
        </div>
      </div>
    </section>
  );
}

