import type { Metadata } from "next";
import { Suspense } from "react";
import { FormFallback } from "../_components/form-fallback";
import { ResetPasswordForm } from "../_components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Send yourself a link to set a new Isra Chase password.",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<FormFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
