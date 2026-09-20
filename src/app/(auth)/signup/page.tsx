import type { Metadata } from "next";
import { Suspense } from "react";
import { FormFallback } from "../_components/form-fallback";
import { SignUpForm } from "../_components/sign-up-form";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create an Isra Chase account to build camera, text and GPS missions and run them live.",
  robots: { index: false },
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<FormFallback />}>
      <SignUpForm />
    </Suspense>
  );
}
