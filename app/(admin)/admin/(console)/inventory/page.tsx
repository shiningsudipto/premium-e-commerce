import type { Metadata } from "next";
import { Suspense } from "react";
import { InventoryScreen } from "@/src/admin/features/inventory/inventory-screen";

export const metadata: Metadata = { title: "Inventory" };

export default function Page() {
  return (
    <Suspense>
      <InventoryScreen />
    </Suspense>
  );
}
