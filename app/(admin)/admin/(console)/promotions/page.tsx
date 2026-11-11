import type { Metadata } from "next";
import { Suspense } from "react";
import { PromotionsScreen } from "@/src/admin/features/promotions/promotions-screen";

export const metadata: Metadata = { title: "Promotions" };

export default function Page() {
  return (
    <Suspense>
      <PromotionsScreen />
    </Suspense>
  );
}
