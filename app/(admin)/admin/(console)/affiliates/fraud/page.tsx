import type { Metadata } from "next";
import { Suspense } from "react";
import { FraudScreen } from "@/src/admin/features/affiliate-ops/fraud-screen";

export const metadata: Metadata = { title: "Fraud review" };

export default function Page() {
  return (
    <Suspense>
      <FraudScreen />
    </Suspense>
  );
}
