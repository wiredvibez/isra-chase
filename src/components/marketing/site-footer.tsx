import Link from "next/link";
import { Logo } from "@/components/marketing/logo";

/** Only the product's own pages and sections — nothing invented. */
const groups: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "מה זה עושה",
    links: [
      { href: "/#missions", label: "סוגי משימות" },
      { href: "/#live", label: "איך מריצים מרדף" },
      { href: "/#moderation", label: "בקרה" },
      { href: "/#how-it-works", label: "איך זה עובד" },
    ],
  },
  {
    title: "למארגנים",
    links: [
      { href: "/studio", label: "הסטודיו" },
      { href: "/signup", label: "פתיחת חשבון" },
      { href: "/signin", label: "כניסה" },
      { href: "/reset-password", label: "איפוס סיסמה" },
    ],
  },
  {
    title: "לשחקנים",
    links: [{ href: "/#join", label: "הצטרפות עם קוד" }],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              בונים משימות צילום, טקסט ומיקום, מחלקים קוד הצטרפות, ומנקדים חבורה
              שלמה בזמן אמת.
            </p>
          </div>

          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="font-display text-sm font-bold">{group.title}</h2>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="rounded-sm text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          Isra Chase היא פלטפורמת ציד מטמון עצמאית, בלי שום קשר למוצרי ציד או
          חוויה אחרים.
        </p>
      </div>
    </footer>
  );
}
