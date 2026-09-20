import type { Metadata } from "next";
import { Suspense } from "react";
import { FormFallback } from "../_components/form-fallback";
import { ResetPasswordForm } from "../_components/reset-password-form";

export const metadata: Metadata = {
  title: "איפוס סיסמה",
  description: "שולחים לעצמכם קישור לבחירת סיסמה חדשה ל-Isra Chase.",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<FormFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
