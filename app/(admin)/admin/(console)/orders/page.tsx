import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersScreen } from "@/src/admin/features/orders/orders-screen";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return (
    <Suspense>
      <OrdersScreen />
    </Suspense>
  );
}
