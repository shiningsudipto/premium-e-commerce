import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsScreen } from "@/src/admin/features/reports/reports-screen";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <Suspense>
      <ReportsScreen />
    </Suspense>
  );
}
