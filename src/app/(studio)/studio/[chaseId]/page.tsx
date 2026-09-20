"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

/** The console has no landing tab of its own — Details is the entry point. */
export default function ChaseIndexPage() {
  const params = useParams();
  const router = useRouter();
  const chaseId = String(params?.chaseId ?? "");

  React.useEffect(() => {
    if (chaseId) router.replace(`/studio/${chaseId}/details`);
  }, [chaseId, router]);

  return <Skeleton className="h-64 w-full" />;
}
