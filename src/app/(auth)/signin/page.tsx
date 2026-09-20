import type { Metadata } from "next";
import { Suspense } from "react";
import { FormFallback } from "../_components/form-fallback";
import { SignInForm } from "../_components/sign-in-form";

export const metadata: Metadata = {
  title: "כניסה",
  description: "נכנסים ל-Isra Chase כדי לבנות מרדפים, להריץ אותם ולנהל את ההגשות.",
  robots: { index: false },
};

export default function SignInPage() {
  return (
    <Suspense fallback={<FormFallback />}>
      <SignInForm />
    </Suspense>
  );
}
