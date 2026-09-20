import type { Metadata } from "next";
import { Suspense } from "react";
import { FormFallback } from "../_components/form-fallback";
import { SignUpForm } from "../_components/sign-up-form";

export const metadata: Metadata = {
  title: "פתיחת חשבון",
  description:
    "פותחים חשבון ב-Isra Chase כדי לבנות משימות צילום, טקסט ומיקום ולהריץ אותן באוויר.",
  robots: { index: false },
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<FormFallback />}>
      <SignUpForm />
    </Suspense>
  );
}
