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
            This trail goes nowhere.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            The page you were after does not exist. If you were trying to join a
            chase, the code may have a typo, or the organiser may have ended it.
          </p>

          <div className="mt-8 rounded-lg border border-border bg-surface p-4 shadow-card">
            <JoinCodeForm />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
            >
              Back to the home page
            </Link>
            <Link
              href="/studio"
              className="inline-flex h-11 items-center rounded-md border border-border-strong bg-surface px-5 text-sm font-semibold hover:bg-surface-muted"
            >
              Open the Studio
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
