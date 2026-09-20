import type { Metadata } from "next";
import { Suspense } from "react";
import { FormFallback } from "../_components/form-fallback";
import { SignInForm } from "../_components/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Isra Chase to build, run and moderate your chases.",
  robots: { index: false },
};

export default function SignInPage() {
  return (
    <Suspense fallback={<FormFallback />}>
      <SignInForm />
    </Suspense>
  );
}
