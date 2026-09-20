import type { ReactNode } from "react";
import Link from "next/link";
import { Logo, LogoMark } from "@/components/marketing/logo";

const promises = [
  "משימות צילום, טקסט ומיקום במקום אחד",
  "הניקוד נסגר בשרת, אז אף אחד לא מנפח לעצמו סכום",
  "פיד בזמן אמת, טבלת מובילים בזמן אמת ויומן שינויים מלא",
];

/**
 * Split panel: the form column always comes first in the DOM so keyboard and
 * screen-reader users reach it immediately, with the brand panel following on
 * mobile and sitting alongside from `lg` up.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-2">
      <div className="flex flex-col">
        <header className="px-5 py-5 sm:px-8">
          <Link href="/" className="inline-flex rounded-sm">
            <Logo />
            <span className="sr-only">— חזרה לדף הבית</span>
          </Link>
        </header>

        <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-4 sm:px-8 lg:items-center lg:pb-24">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>

      <aside className="relative flex items-center overflow-hidden bg-brand-700 px-6 py-12 text-white sm:px-10 lg:px-14 lg:py-16">
        <svg
          aria-hidden
          viewBox="0 0 320 320"
          className="pointer-events-none absolute -end-16 -top-16 w-[26rem] text-white/10"
        >
          <g fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round">
            <path d="M30 280c40-10 30-90 80-110s60-70 110-100" strokeDasharray="1 34" />
            <circle cx="232" cy="64" r="34" />
            <circle cx="120" cy="178" r="16" />
          </g>
        </svg>

        <div className="relative max-w-md">
          <LogoMark className="size-11" />
          <p className="mt-6 font-display text-2xl font-extrabold leading-snug sm:text-3xl">
            בונים את המשימות. מחלקים קוד אחד. צופים בחבורה שלמה משחקת.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-white/85">
            {promises.map((line) => (
              <li key={line} className="flex gap-2.5">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
