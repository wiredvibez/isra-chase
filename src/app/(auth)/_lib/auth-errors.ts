/**
 * Firebase throws codes like `auth/invalid-credential`. Those must never reach
 * a person, so every code we can foresee gets a sentence, and everything else
 * falls back to one honest line.
 *
 * `null` means "say nothing": the user cancelled the Google popup themselves,
 * and telling them about it would be noise.
 */
const MESSAGES: Record<string, string | null> = {
  "auth/invalid-credential": "That email and password don't match.",
  "auth/wrong-password": "That email and password don't match.",
  "auth/user-not-found": "That email and password don't match.",
  "auth/invalid-email": "That doesn't look like an email address.",
  "auth/missing-password": "Enter your password.",
  "auth/email-already-in-use": "There's already an account with that email.",
  "auth/weak-password": "Passwords need at least six characters.",
  "auth/user-disabled": "That account has been disabled.",
  "auth/too-many-requests":
    "Too many attempts from this device. Wait a minute and try again.",
  "auth/network-request-failed":
    "We couldn't reach the server. Check your connection and try again.",
  "auth/popup-blocked":
    "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
  "auth/operation-not-allowed":
    "That sign-in method isn't enabled for this app yet.",
  // The person closed the Google window on purpose — not an error worth showing.
  "auth/popup-closed-by-user": null,
  "auth/cancelled-popup-request": null,
  "auth/user-cancelled": null,
};

const FALLBACK = "Something went wrong on our side. Please try again.";

function codeOf(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return null;
}

/** A sentence to show the user, or `null` to stay quiet. */
export function describeAuthError(error: unknown): string | null {
  const code = codeOf(error);
  if (code && code in MESSAGES) return MESSAGES[code];
  return FALLBACK;
}
