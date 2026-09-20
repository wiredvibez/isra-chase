import type { Metadata } from "next";
import { JoinCodeForm } from "@/components/play/join-code-form";

export const metadata: Metadata = {
  title: "Join a chase",
  description: "Enter your join code to hop into a chase.",
};

export default function JoinPage() {
  return <JoinCodeForm />;
}
