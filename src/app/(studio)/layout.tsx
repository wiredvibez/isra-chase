"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Rocket } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Menu } from "@/components/studio/menu";

/**
 * The Studio is organizer-only, so it gates on the client auth state and never
 * renders its children (and therefore never opens a Firestore subscription)
 * until a user is known.
 */
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, pathname, router]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4">
          <Link
            href="/studio"
            className="flex items-center gap-2 font-display text-base font-bold"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Rocket className="size-4" aria-hidden />
            </span>
            Isra Chase
            <span className="text-muted-foreground">סטודיו</span>
          </Link>
          <div className="flex-1" />
          {user && (
            <Menu
              label="תפריט החשבון"
              trigger={
                <Avatar
                  name={user.displayName ?? user.email ?? "משתמש"}
                  src={user.photoURL}
                  size="sm"
                />
              }
              items={[
                {
                  id: "signout",
                  label: "יציאה",
                  icon: <LogOut className="size-4" aria-hidden />,
                  onSelect: () => void signOut(),
                },
              ]}
            />
          )}
        </div>
      </header>

      {user ? (
        <main className="flex-1">{children}</main>
      ) : (
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </main>
      )}
    </div>
  );
}
