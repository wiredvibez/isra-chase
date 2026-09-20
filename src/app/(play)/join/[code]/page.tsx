import type { Metadata } from "next";
import { JoinFlow } from "@/components/play/join-flow";

export const metadata: Metadata = {
  title: "הצטרפות למרדף",
};

export default async function JoinWithCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <JoinFlow code={decodeURIComponent(code)} />;
}
