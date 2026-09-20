import Link from "next/link";
import { LogoMark } from "@/components/marketing/logo";

const sections = [
  { href: "/#missions", label: "Mission types" },
  { href: "/#live", label: "Running a chase" },
  { href: "/#moderation", label: "Moderation" },
  { href: "/#how-it-works", label: "How it works" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-sm font-display text-lg font-extrabold tracking-tight"
        >
          <LogoMark />
          <span className="hidden sm:inline">Isra Chase</span>
          <span className="sr-only sm:hidden">Isra Chase</span>
        </Link>

        <nav aria-label="Page sections" className="ms-4 hidden lg:block">
          <ul className="flex items-center gap-1">
            {sections.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-sm px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/signin"
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-semibold hover:bg-surface-muted"
          >
            Sign in
          </Link>
          <Link
            href="/studio"
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover sm:px-4"
          >
            Create a chase
          </Link>
        </div>
      </div>
    </header>
  );
}
