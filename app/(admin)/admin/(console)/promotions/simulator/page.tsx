import type { Metadata } from "next";
import { Suspense } from "react";
import { SimulatorScreen } from "@/src/admin/features/promotions/promotion-simulator";

export const metadata: Metadata = { title: "Promotion simulator" };

export default function Page() {
  return (
    <Suspense>
      <SimulatorScreen />
    </Suspense>
  );
}
