import type { Metadata } from "next";
import { Suspense } from "react";
import { NewProductScreen } from "@/src/admin/features/products/product-editor";

export const metadata: Metadata = { title: "New product" };

export default function Page() {
  return (
    <Suspense>
      <NewProductScreen />
    </Suspense>
  );
}
