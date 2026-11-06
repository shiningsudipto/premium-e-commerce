import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoriesScreen } from "@/src/admin/features/categories/categories-screen";

export const metadata: Metadata = { title: "Categories" };

export default function Page() {
  return (
    <Suspense>
      <CategoriesScreen />
    </Suspense>
  );
}
