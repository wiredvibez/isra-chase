import Link from "next/link";
import { Logo } from "@/components/marketing/logo";

/** Only the product's own pages and sections — nothing invented. */
const groups: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "What it does",
    links: [
      { href: "/#missions", label: "Mission types" },
      { href: "/#live", label: "Running a chase" },
      { href: "/#moderation", label: "Moderation" },
      { href: "/#how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Organisers",
    links: [
      { href: "/studio", label: "Open the Studio" },
      { href: "/signup", label: "Create an account" },
      { href: "/signin", label: "Sign in" },
      { href: "/reset-password", label: "Reset your password" },
    ],
  },
  {
    title: "Players",
    links: [{ href: "/#join", label: "Join with a code" }],
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
              Build camera, text and GPS missions, hand out a join code, and score
              a whole group live.
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
          Isra Chase is an independent scavenger hunt platform. Not affiliated with
          any other hunt or experience product.
        </p>
      </div>
    </footer>
  );
}
