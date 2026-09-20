import type { Metadata } from "next";
import { JoinCodeForm } from "@/components/play/join-code-form";

export const metadata: Metadata = {
  title: "הצטרפות למרדף",
  description: "מקלידים קוד הצטרפות ונכנסים למרדף.",
};

export default function JoinPage() {
  return <JoinCodeForm />;
}
