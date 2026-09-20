"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { ChaseProvider } from "@/components/studio/chase-context";
import { ChaseShell } from "@/components/studio/chase-shell";

export default function ChaseConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const chaseId = String(params?.chaseId ?? "");

  return (
    <ChaseProvider chaseId={chaseId}>
      <ChaseShell>{children}</ChaseShell>
    </ChaseProvider>
  );
}
