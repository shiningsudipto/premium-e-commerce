import type { Metadata } from "next";
import { Suspense } from "react";
import { MfaVerifyForm } from "@/src/admin/features/auth/mfa-forms";

export const metadata: Metadata = { title: "Two-step verification" };

export default function MfaPage() {
  return (
    <Suspense>
      <MfaVerifyForm />
    </Suspense>
  );
}
