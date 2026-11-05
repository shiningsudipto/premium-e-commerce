import type { Metadata } from "next";
import { Suspense } from "react";
import { MfaEnrollForm } from "@/src/admin/features/auth/mfa-forms";

export const metadata: Metadata = { title: "Set up two-step verification" };

export default function MfaEnrollPage() {
  return (
    <Suspense>
      <MfaEnrollForm />
    </Suspense>
  );
}
