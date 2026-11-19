import type { Metadata } from "next";
import { Suspense } from "react";
import { PayoutBatchesScreen } from "@/src/admin/features/affiliate-ops/payouts-screen";

export const metadata: Metadata = { title: "Payout batches" };

export default function Page() {
  return (
    <Suspense>
      <PayoutBatchesScreen />
    </Suspense>
  );
}
