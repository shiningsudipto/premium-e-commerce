import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductActivityScreen } from "@/src/admin/features/reports/activity-screen";

export const metadata: Metadata = { title: "Product activity" };

export default function Page() {
  return (
    <Suspense>
      <ProductActivityScreen />
    </Suspense>
  );
}
