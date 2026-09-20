import Link from "next/link";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { JoinCodeForm } from "@/components/marketing/join-code-form";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="font-mono text-sm font-bold tracking-widest text-primary">404</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            השביל הזה לא מוביל לשום מקום.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            הדף שחיפשתם לא קיים. אם ניסיתם להצטרף למרדף, אולי נפלה טעות בקוד,
            או שהמארגן כבר סגר אותו.
          </p>

          <div className="mt-8 rounded-lg border border-border bg-surface p-4 shadow-card">
            <JoinCodeForm />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
            >
              חזרה לדף הבית
            </Link>
            <Link
              href="/studio"
              className="inline-flex h-11 items-center rounded-md border border-border-strong bg-surface px-5 text-sm font-semibold hover:bg-surface-muted"
            >
              פותחים את הסטודיו
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
