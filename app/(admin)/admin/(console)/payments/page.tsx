import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsScreen } from "@/src/admin/features/payments/payments-screen";

export const metadata: Metadata = { title: "Payments" };

export default function Page() {
  return (
    <Suspense>
      <PaymentsScreen />
    </Suspense>
  );
}
