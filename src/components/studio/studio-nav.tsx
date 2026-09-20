"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarClock,
  ClipboardCheck,
  ListChecks,
  Megaphone,
  Palette,
  Settings2,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavTab {
  slug: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  id: string;
  label: string;
  tabs: NavTab[];
}

/** Mirrors Goosechase's Create / Publish / Review information architecture. */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: "create",
    label: "Create",
    tabs: [
      { slug: "details", label: "Details", icon: <Settings2 className="size-4" aria-hidden /> },
      { slug: "missions", label: "Missions", icon: <ListChecks className="size-4" aria-hidden /> },
      { slug: "branding", label: "Branding", icon: <Palette className="size-4" aria-hidden /> },
      { slug: "broadcasts", label: "Broadcasts", icon: <Megaphone className="size-4" aria-hidden /> },
    ],
  },
  {
    id: "publish",
    label: "Publish",
    tabs: [
      { slug: "participants", label: "Participants", icon: <Users className="size-4" aria-hidden /> },
      { slug: "schedule", label: "Start & end", icon: <CalendarClock className="size-4" aria-hidden /> },
    ],
  },
  {
    id: "review",
    label: "Review",
    tabs: [
      { slug: "feed", label: "Activity feed", icon: <Activity className="size-4" aria-hidden /> },
      { slug: "submissions", label: "Submissions", icon: <ClipboardCheck className="size-4" aria-hidden /> },
      { slug: "leaderboard", label: "Leaderboard", icon: <Trophy className="size-4" aria-hidden /> },
      { slug: "stats", label: "Stats", icon: <BarChart3 className="size-4" aria-hidden /> },
    ],
  },
];

function useActiveSlug(chaseId: string) {
  const pathname = usePathname();
  const rest = pathname.replace(`/studio/${chaseId}`, "").replace(/^\//, "");
  return rest.split("/")[0] || "details";
}

/** Sidebar on large screens; a horizontal scrolling rail on phones. */
export function StudioNav({ chaseId }: { chaseId: string }) {
  const active = useActiveSlug(chaseId);

  return (
    <nav aria-label="Chase sections">
      {/* Phone / tablet: one scrolling rail, sections marked inline. */}
      <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 lg:hidden">
        {NAV_SECTIONS.flatMap((section, sectionIndex) => [
          sectionIndex > 0 ? (
            <span
              key={`${section.id}-sep`}
              aria-hidden
              className="my-2 w-px shrink-0 bg-border"
            />
          ) : null,
          ...section.tabs.map((tab) => (
            <Link
              key={tab.slug}
              href={`/studio/${chaseId}/${tab.slug}`}
              aria-current={active === tab.slug ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap",
                active === tab.slug
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
            </Link>
          )),
        ])}
      </div>

      {/* Desktop: grouped sidebar. */}
      <div className="hidden lg:block">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id} className="mb-5">
            <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.tabs.map((tab) => (
                <li key={tab.slug}>
                  <Link
                    href={`/studio/${chaseId}/${tab.slug}`}
                    aria-current={active === tab.slug ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold",
                      active === tab.slug
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-100"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
