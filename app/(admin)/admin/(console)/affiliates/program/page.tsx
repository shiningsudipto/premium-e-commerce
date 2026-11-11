import type { Metadata } from "next";
import { Suspense } from "react";
import { AffiliateProgramScreen } from "@/src/admin/features/affiliates/program-screen";

export const metadata: Metadata = { title: "Tiers & commission" };

export default function Page() {
  return (
    <Suspense>
      <AffiliateProgramScreen />
    </Suspense>
  );
}
