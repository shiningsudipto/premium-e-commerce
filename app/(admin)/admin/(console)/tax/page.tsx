import type { Metadata } from "next";
import { Suspense } from "react";
import { TaxScreen } from "@/src/admin/features/tax/tax-screen";

export const metadata: Metadata = { title: "Tax" };

export default function Page() {
  return (
    <Suspense>
      <TaxScreen />
    </Suspense>
  );
}
