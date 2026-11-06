import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsScreen } from "@/src/admin/features/products/products-screen";

export const metadata: Metadata = { title: "Products" };

export default function Page() {
  return (
    <Suspense>
      <ProductsScreen />
    </Suspense>
  );
}
