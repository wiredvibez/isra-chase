export const DEFAULT_REDIRECT = "/studio";

/**
 * `?next=` comes from the URL, so it is attacker-controlled. Only same-site
 * absolute paths are allowed through; anything else (a full URL, a
 * protocol-relative `//evil.example`) falls back to the Studio.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_REDIRECT;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return DEFAULT_REDIRECT;
  }
  return raw;
}

/** Carry the pending destination across the sign-in / sign-up / reset links. */
export function withNext(href: string, next: string): string {
  return next === DEFAULT_REDIRECT
    ? href
    : `${href}?next=${encodeURIComponent(next)}`;
}
