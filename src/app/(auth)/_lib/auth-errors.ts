/**
 * Firebase throws codes like `auth/invalid-credential`. Those must never reach
 * a person, so every code we can foresee gets a sentence, and everything else
 * falls back to one honest line.
 *
 * `null` means "say nothing": the user cancelled the Google popup themselves,
 * and telling them about it would be noise.
 */
const MESSAGES: Record<string, string | null> = {
  "auth/invalid-credential": "האימייל והסיסמה האלה לא מסתדרים ביחד.",
  "auth/wrong-password": "האימייל והסיסמה האלה לא מסתדרים ביחד.",
  "auth/user-not-found": "האימייל והסיסמה האלה לא מסתדרים ביחד.",
  "auth/invalid-email": "זה לא נראה כמו כתובת אימייל.",
  "auth/missing-password": "צריך להקליד סיסמה.",
  "auth/email-already-in-use": "כבר יש חשבון עם האימייל הזה.",
  "auth/weak-password": "סיסמה צריכה לפחות 6 תווים.",
  "auth/user-disabled": "החשבון הזה חסום.",
  "auth/too-many-requests":
    "יותר מדי ניסיונות מהמכשיר הזה. חכו דקה ותנסו שוב.",
  "auth/network-request-failed":
    "לא הצלחנו להגיע לשרת. תבדקו את החיבור ותנסו שוב.",
  "auth/popup-blocked":
    "הדפדפן חסם את החלון של Google. תאשרו חלונות קופצים לאתר הזה ותנסו שוב.",
  "auth/operation-not-allowed":
    "שיטת הכניסה הזאת עוד לא מופעלת באפליקציה.",
  // The person closed the Google window on purpose — not an error worth showing.
  "auth/popup-closed-by-user": null,
  "auth/cancelled-popup-request": null,
  "auth/user-cancelled": null,
};

const FALLBACK = "משהו השתבש אצלנו. תנסו שוב.";

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
