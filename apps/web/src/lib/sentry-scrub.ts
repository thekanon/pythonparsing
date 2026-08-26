import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

export function scrubSentryBreadcrumb(
  breadcrumb: Breadcrumb,
): Breadcrumb | null {
  if (breadcrumb.category === "console" || breadcrumb.category === "fetch")
    return null;
  const scrubbed: Breadcrumb = {};
  if (breadcrumb.category !== undefined)
    scrubbed.category = breadcrumb.category;
  if (breadcrumb.level !== undefined) scrubbed.level = breadcrumb.level;
  if (breadcrumb.timestamp !== undefined)
    scrubbed.timestamp = breadcrumb.timestamp;
  if (breadcrumb.type !== undefined) scrubbed.type = breadcrumb.type;
  return scrubbed;
}

const SAFE_EXTRA_KEYS = new Set([
  "errorCode",
  "learningDate",
  "publishedCount",
  "warningCode",
]);

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.contexts;
  if (event.extra) {
    const safeExtra: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event.extra)) {
      if (
        SAFE_EXTRA_KEYS.has(key) &&
        (value === null ||
          ["string", "number", "boolean"].includes(typeof value))
      ) {
        safeExtra[key] = value;
      }
    }
    if (Object.keys(safeExtra).length > 0) event.extra = safeExtra;
    else delete event.extra;
  }
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.env;
    delete event.request.headers;
    delete event.request.query_string;
    if (event.request.url) event.request.url = event.request.url.split("?")[0]!;
  }
  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      exception.value = exception.type ?? "Redacted error";
    }
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(scrubSentryBreadcrumb)
      .filter((breadcrumb): breadcrumb is Breadcrumb => breadcrumb !== null);
  }
  return event;
}
