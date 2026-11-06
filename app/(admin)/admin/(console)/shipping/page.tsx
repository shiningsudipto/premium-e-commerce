import type { Metadata } from "next";
import { Suspense } from "react";
import { ShippingScreen } from "@/src/admin/features/shipping/shipping-screen";

export const metadata: Metadata = { title: "Shipping" };

export default function Page() {
  return (
    <Suspense>
      <ShippingScreen />
    </Suspense>
  );
}
