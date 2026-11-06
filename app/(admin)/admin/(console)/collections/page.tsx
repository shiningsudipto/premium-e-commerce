import type { Metadata } from "next";
import { Suspense } from "react";
import { CollectionsScreen } from "@/src/admin/features/collections/collections-screen";

export const metadata: Metadata = { title: "Collections" };

export default function Page() {
  return (
    <Suspense>
      <CollectionsScreen />
    </Suspense>
  );
}
