import type { Metadata } from "next";
import { Suspense } from "react";
import { DataScreen } from "@/src/admin/features/data/data-screen";

export const metadata: Metadata = { title: "Import & export" };

export default function Page() {
  return (
    <Suspense>
      <DataScreen />
    </Suspense>
  );
}
