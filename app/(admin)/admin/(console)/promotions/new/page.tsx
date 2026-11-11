import type { Metadata } from "next";
import { Suspense } from "react";
import { NewPromotionScreen } from "@/src/admin/features/promotions/promotion-editor";

export const metadata: Metadata = { title: "New promotion" };

export default function Page() {
  return (
    <Suspense>
      <NewPromotionScreen />
    </Suspense>
  );
}
