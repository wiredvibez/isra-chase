import type { Metadata } from "next";
import { PlayProvider } from "@/components/play/play-provider";
import { PlayShell } from "@/components/play/play-shell";

export const metadata: Metadata = {
  title: "המרדף",
};

/**
 * The participant shell. Everything under it shares one provider, so the live
 * Firestore subscriptions (chase, team, notifications) survive tab switches
 * and the mission list isn't re-fetched on every navigation.
 */
export default async function PlayLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ chaseId: string }>;
}) {
  const { chaseId } = await params;
  return (
    <PlayProvider chaseId={chaseId}>
      <PlayShell>{children}</PlayShell>
    </PlayProvider>
  );
}
