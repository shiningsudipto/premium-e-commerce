import type { Metadata } from "next";
import { Suspense } from "react";
import { AffiliatesScreen } from "@/src/admin/features/affiliates/affiliates-screen";

export const metadata: Metadata = { title: "Affiliates" };

export default function Page() {
  return (
    <Suspense>
      <AffiliatesScreen />
    </Suspense>
  );
}
